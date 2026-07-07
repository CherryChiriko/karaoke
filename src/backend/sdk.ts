import { Song, KrcLine, ScoreState } from "../types";

// Point this at wherever you host the FastAPI backend.
export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api";

// ---------------------------------------------------------------------------
// Song library — now fetched from the backend instead of hardcoded mocks.
// Kept as a mutable array (App.tsx reads it synchronously in a couple spots)
// and refreshed via loadSongLibrary(), which callers should await once on
// mount.
// ---------------------------------------------------------------------------
export const SONG_LIBRARY: Song[] = [];

export async function loadSongLibrary(): Promise<Song[]> {
  const res = await fetch(`${API_BASE}/songs`);
  if (!res.ok) throw new Error(`Failed to load song library: ${res.status}`);
  const songs = await res.json();
  SONG_LIBRARY.length = 0;
  SONG_LIBRARY.push(...songs);
  return SONG_LIBRARY;
}

// Fetches the full Song (krcLines + pitchBlocks) for a given library entry,
// and resolves the streamable audio URL.
export async function fetchFullSong(songId: string): Promise<Song> {
  const res = await fetch(`${API_BASE}/songs/${songId}`);
  if (!res.ok) throw new Error(`Failed to load song ${songId}: ${res.status}`);
  return res.json();
}

export function getAudioUrl(songId: string): string {
  return `${API_BASE}/audio/${songId}`;
}

// ---------------------------------------------------------------------------
// "Ordering" a song = the backend already has it processed (pitch + lyrics
// baked into static JSON), so this just simulates the fetch-over-network
// progress bar the UI expects. Swap this for a real download-to-cache step
// (e.g. Cache Storage API) if you want offline play.
// ---------------------------------------------------------------------------
export async function requestResource(
  songId: string,
  onProgress: (percent: number) => void
): Promise<boolean> {
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    await new Promise((r) => setTimeout(r, 80));
    onProgress(Math.round((i / steps) * 100));
  }
  return true;
}

export async function getKrcLyricByToken(token: string): Promise<KrcLine[]> {
  const song = await fetchFullSong(token);
  return song.krcLines;
}

// ---------------------------------------------------------------------------
// Standard (target) pitch lookup — just an interval search over pitchBlocks.
// ---------------------------------------------------------------------------
export function getStandardPitch(song: Song, timeMs: number): number | null {
  const block = song.pitchBlocks.find(
    (b) => timeMs >= b.startTime && timeMs <= b.startTime + b.duration
  );
  return block ? block.pitch : null;
}

// ---------------------------------------------------------------------------
// Real-time pitch detection.
//
// Mic mode: autocorrelation-based fundamental-frequency estimator (the same
// family of algorithm as the open-source "Pitchy"/aubio YIN detectors) run
// directly against the AnalyserNode's time-domain buffer — no external
// service, no dependency, works fully offline in the browser.
//
// Simulated mode: for the "AUTO-VOCAL ASSISTANT" toggle, snaps to the
// standard pitch with tiny natural jitter so it still looks like a human
// singing along.
// ---------------------------------------------------------------------------
function autocorrelate(buf: Float32Array, sampleRate: number): number | null {
  const SIZE = buf.length;

  // RMS gate: skip silence/noise floor
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return null;

  // Trim leading/trailing near-silence to stabilize the autocorrelation window
  let start = 0;
  let end = SIZE - 1;
  const threshold = 0.2;
  while (start < SIZE / 2 && Math.abs(buf[start]) < threshold) start++;
  while (end > SIZE / 2 && Math.abs(buf[end]) < threshold) end--;

  const trimmed = buf.slice(start, end);
  const n = trimmed.length;
  if (n < 512) return null;

  const c = new Float32Array(n);
  for (let lag = 0; lag < n; lag++) {
    let sum = 0;
    for (let i = 0; i < n - lag; i++) {
      sum += trimmed[i] * trimmed[i + lag];
    }
    c[lag] = sum;
  }

  // Find the first dip then the following peak (classic autocorrelation
  // pitch-picking heuristic used by YIN-style detectors)
  let d = 0;
  while (d < n - 1 && c[d] > c[d + 1]) d++;

  let maxPos = -1;
  let maxVal = -Infinity;
  for (let i = d; i < n; i++) {
    if (c[i] > maxVal) {
      maxVal = c[i];
      maxPos = i;
    }
  }
  if (maxPos <= 0) return null;

  // Parabolic interpolation around the peak for sub-sample accuracy
  const x0 = maxPos < 1 ? maxPos : maxPos - 1;
  const x2 = maxPos + 1 < n ? maxPos + 1 : maxPos;
  let betterPos = maxPos;
  if (x0 !== maxPos && x2 !== maxPos) {
    const a = c[x0], b = c[maxPos], cc = c[x2];
    const denom = a - 2 * b + cc;
    if (denom !== 0) betterPos = maxPos + 0.5 * (a - cc) / denom;
  }

  const freq = sampleRate / betterPos;
  if (freq < 60 || freq > 1200) return null; // outside plausible vocal range
  return freq;
}

export function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function hzToMidi(hz: number): number {
  return 69 + 12 * Math.log2(hz / 440);
}

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export function getNoteNotation(midi: number): string {
  const rounded = Math.round(midi);
  const octave = Math.floor(rounded / 12) - 1;
  const name = NOTE_NAMES[((rounded % 12) + 12) % 12];
  return `${name}${octave}`;
}

let simPhase = 0;

export function getCurrentPitch(
  analyser: AnalyserNode | null,
  audioCtx: AudioContext | null,
  targetMidi: number | null,
  isSimulated: boolean,
  timeMs?: number
): { midi: number; hz: number; isMatched: boolean } | null {
  if (isSimulated) {
    if (targetMidi === null) return null;
    // Gentle sinusoidal jitter around the target so the trail still looks
    // like a real (very accurate) singer rather than a perfectly flat line.
    simPhase = (timeMs ?? simPhase + 16) * 0.004;
    const jitter = Math.sin(simPhase) * 0.4;
    const midi = targetMidi + jitter;
    return { midi, hz: midiToHz(midi), isMatched: Math.abs(jitter) <= 1.5 };
  }

  if (!analyser || !audioCtx) return null;

  const buf = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(buf);
  const freq = autocorrelate(buf, audioCtx.sampleRate);
  if (freq === null) return null;

  const midi = hzToMidi(freq);
  const isMatched = targetMidi !== null && Math.abs(midi - targetMidi) <= 1.5;
  return { midi, hz: freq, isMatched };
}

// ---------------------------------------------------------------------------
// Scoring — delegates to the backend so scoring logic has one source of
// truth (and could later account for server-side leaderboards, etc). Falls
// back to local computation if the backend is unreachable, so the room never
// hard-fails mid-performance.
// ---------------------------------------------------------------------------
export async function getPreviousScore(
  song: Song,
  lineIndex: number,
  userPitchHistory: { time: number; pitch: number; isMatched: boolean }[]
): Promise<number> {
  const line = song.krcLines[lineIndex];
  if (!line) return 0;

  try {
    const res = await fetch(`${API_BASE}/score/line`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target_blocks: song.pitchBlocks,
        line_start: line.startTime,
        line_end: line.startTime + line.duration,
        user_pitch_history: userPitchHistory,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.accuracy;
    }
  } catch {
    // fall through to local fallback
  }

  const points = userPitchHistory.filter(
    (p) => p.time >= line.startTime && p.time <= line.startTime + line.duration
  );
  if (points.length === 0) return 0;
  const hits = points.filter((p) => p.isMatched).length;
  return Math.round((hits / points.length) * 100);
}

export async function getTotalScore(
  lineScores: Record<number, number>,
  totalLines: number
): Promise<{ pointTotal: number; rank: ScoreState["rank"] }> {
  try {
    const res = await fetch(`${API_BASE}/score/total`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ line_scores: lineScores, total_lines: totalLines }),
    });
    if (res.ok) return res.json();
  } catch {
    // fall through to local fallback
  }

  const values = Object.values(lineScores);
  const pointTotal = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
  let rank: ScoreState["rank"] = "F";
  if (pointTotal >= 90) rank = "S";
  else if (pointTotal >= 75) rank = "A";
  else if (pointTotal >= 55) rank = "B";
  else if (pointTotal >= 30) rank = "C";
  return { pointTotal, rank };
}
