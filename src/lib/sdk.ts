import { Song, KrcLine, PitchBlock } from "../types";

// Generate clean synthetic song data for the application
export const SONG_LIBRARY: Song[] = [
  {
    id: "neon_drift",
    title: "Neon Drift",
    artist: "Synthia Vane",
    duration: 50, // seconds for a sweet interactive session
    bpm: 110,
    description: "A high-octane synthwave cruise through a digital rain of neon pulses.",
    albumArt: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&auto=format&fit=crop&q=80",
    lyricToken: "tok_neon_drift_8829",
    krcLines: [
      {
        startTime: 3000,
        duration: 4500,
        lineIndex: 0,
        text: "And when he pulls up in a car",
        words: [
          { text: "And ", startTime: 3000, duration: 400 },
          { text: "when ", startTime: 3400, duration: 500 },
          { text: "he ", startTime: 3900, duration: 400 },
          { text: "pulls ", startTime: 4300, duration: 600 },
          { text: "up ", startTime: 4900, duration: 400 },
          { text: "in ", startTime: 5300, duration: 400 },
          { text: "a ", startTime: 5700, duration: 300 },
          { text: "car", startTime: 6000, duration: 1500 }
        ]
      },
      {
        startTime: 8500,
        duration: 5000,
        lineIndex: 1,
        text: "He looks so good in his leather",
        words: [
          { text: "He ", startTime: 8500, duration: 500 },
          { text: "looks ", startTime: 9000, duration: 500 },
          { text: "so ", startTime: 9500, duration: 500 },
          { text: "good ", startTime: 10000, duration: 600 },
          { text: "in ", startTime: 10600, duration: 400 },
          { text: "his ", startTime: 11000, duration: 400 },
          { text: "leather", startTime: 11400, duration: 2100 }
        ]
      },
      {
        startTime: 14500,
        duration: 5500,
        lineIndex: 2,
        text: "We drift through the digital stars",
        words: [
          { text: "We ", startTime: 14500, duration: 500 },
          { text: "drift ", startTime: 15000, duration: 700 },
          { text: "through ", startTime: 15700, duration: 600 },
          { text: "the ", startTime: 16300, duration: 400 },
          { text: "digital ", startTime: 16700, duration: 1100 },
          { text: "stars", startTime: 17800, duration: 2200 }
        ]
      },
      {
        startTime: 21000,
        duration: 5000,
        lineIndex: 3,
        text: "Into the neon forever",
        words: [
          { text: "Into ", startTime: 21000, duration: 900 },
          { text: "the ", startTime: 21900, duration: 500 },
          { text: "neon ", startTime: 22400, duration: 1100 },
          { text: "forever", startTime: 23500, duration: 2500 }
        ]
      },
      {
        startTime: 27000,
        duration: 5000,
        lineIndex: 4,
        text: "This virtual city is ours",
        words: [
          { text: "This ", startTime: 27000, duration: 700 },
          { text: "virtual ", startTime: 27700, duration: 1000 },
          { text: "city ", startTime: 28700, duration: 800 },
          { text: "is ", startTime: 29500, duration: 400 },
          { text: "ours", startTime: 29900, duration: 2100 }
        ]
      },
      {
        startTime: 33000,
        duration: 5500,
        lineIndex: 5,
        text: "Singing through circuits together",
        words: [
          { text: "Singing ", startTime: 33000, duration: 1000 },
          { text: "through ", startTime: 34000, duration: 700 },
          { text: "circuits ", startTime: 34700, duration: 1100 },
          { text: "together", startTime: 35800, duration: 2700 }
        ]
      },
      {
        startTime: 40000,
        duration: 6000,
        lineIndex: 6,
        text: "Beneath the glowing blue tower",
        words: [
          { text: "Beneath ", startTime: 40000, duration: 1000 },
          { text: "the ", startTime: 41000, duration: 500 },
          { text: "glowing ", startTime: 41500, duration: 1000 },
          { text: "blue ", startTime: 42500, duration: 700 },
          { text: "tower", startTime: 43200, duration: 2800 }
        ]
      }
    ],
    pitchBlocks: [
      // Line 0
      { startTime: 3000, duration: 400, pitch: 60 },
      { startTime: 3400, duration: 500, pitch: 62 },
      { startTime: 3900, duration: 400, pitch: 64 },
      { startTime: 4300, duration: 600, pitch: 65 },
      { startTime: 4900, duration: 400, pitch: 67 },
      { startTime: 5300, duration: 400, pitch: 65 },
      { startTime: 5700, duration: 300, pitch: 64 },
      { startTime: 6000, duration: 1500, pitch: 62 },
      // Line 1
      { startTime: 8500, duration: 500, pitch: 64 },
      { startTime: 9000, duration: 500, pitch: 64 },
      { startTime: 9500, duration: 500, pitch: 67 },
      { startTime: 10000, duration: 600, pitch: 67 },
      { startTime: 10600, duration: 400, pitch: 69 },
      { startTime: 11000, duration: 400, pitch: 67 },
      { startTime: 11400, duration: 2100, pitch: 65 },
      // Line 2
      { startTime: 14500, duration: 500, pitch: 60 },
      { startTime: 15000, duration: 700, pitch: 64 },
      { startTime: 15700, duration: 600, pitch: 67 },
      { startTime: 16300, duration: 400, pitch: 64 },
      { startTime: 16700, duration: 1100, pitch: 69 },
      { startTime: 17800, duration: 2200, pitch: 71 },
      // Line 3
      { startTime: 21000, duration: 900, pitch: 72 },
      { startTime: 21900, duration: 500, pitch: 71 },
      { startTime: 22400, duration: 1100, pitch: 69 },
      { startTime: 23500, duration: 2500, pitch: 67 },
      // Line 4
      { startTime: 27000, duration: 700, pitch: 60 },
      { startTime: 27700, duration: 1000, pitch: 64 },
      { startTime: 28700, duration: 800, pitch: 67 },
      { startTime: 29500, duration: 400, pitch: 65 },
      { startTime: 29900, duration: 2100, pitch: 64 },
      // Line 5
      { startTime: 33000, duration: 1000, pitch: 62 },
      { startTime: 34000, duration: 700, pitch: 64 },
      { startTime: 34700, duration: 1100, pitch: 67 },
      { startTime: 35800, duration: 2700, pitch: 69 },
      // Line 6
      { startTime: 40000, duration: 1000, pitch: 60 },
      { startTime: 41000, duration: 500, pitch: 62 },
      { startTime: 41500, duration: 1000, pitch: 64 },
      { startTime: 42500, duration: 700, pitch: 65 },
      { startTime: 43200, duration: 2800, pitch: 67 }
    ]
  },
  {
    id: "midnight_circuit",
    title: "Midnight Circuit",
    artist: "Pixel Pulse",
    duration: 48,
    bpm: 125,
    description: "Deep driving analog sweeps and glitchy vocal triggers for nighttime explorers.",
    albumArt: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80",
    lyricToken: "tok_midnight_circuit_1223",
    krcLines: [
      {
        startTime: 2500,
        duration: 5000,
        lineIndex: 0,
        text: "Lost inside this silicon screen",
        words: [
          { text: "Lost ", startTime: 2500, duration: 600 },
          { text: "inside ", startTime: 3100, duration: 900 },
          { text: "this ", startTime: 4000, duration: 500 },
          { text: "silicon ", startTime: 4500, duration: 1100 },
          { text: "screen", startTime: 5600, duration: 1900 }
        ]
      },
      {
        startTime: 8000,
        duration: 5500,
        lineIndex: 1,
        text: "Chasing echoes of a ghost in the machine",
        words: [
          { text: "Chasing ", startTime: 8000, duration: 900 },
          { text: "echoes ", startTime: 8900, duration: 800 },
          { text: "of ", startTime: 9700, duration: 300 },
          { text: "a ", startTime: 10000, duration: 300 },
          { text: "ghost ", startTime: 10300, duration: 700 },
          { text: "in ", startTime: 11000, duration: 400 },
          { text: "the ", startTime: 11400, duration: 400 },
          { text: "machine", startTime: 11800, duration: 1700 }
        ]
      },
      {
        startTime: 14000,
        duration: 5000,
        lineIndex: 2,
        text: "Hear the code begin to whisper",
        words: [
          { text: "Hear ", startTime: 14000, duration: 600 },
          { text: "the ", startTime: 14600, duration: 400 },
          { text: "code ", startTime: 15000, duration: 800 },
          { text: "begin ", startTime: 15800, duration: 800 },
          { text: "to ", startTime: 16600, duration: 400 },
          { text: "whisper", startTime: 17000, duration: 2000 }
        ]
      },
      {
        startTime: 20000,
        duration: 5500,
        lineIndex: 3,
        text: "Like a cold magnetic sister",
        words: [
          { text: "Like ", startTime: 20000, duration: 600 },
          { text: "a ", startTime: 20600, duration: 400 },
          { text: "cold ", startTime: 21000, duration: 800 },
          { text: "magnetic ", startTime: 21800, duration: 1100 },
          { text: "sister", startTime: 22900, duration: 2600 }
        ]
      },
      {
        startTime: 26500,
        duration: 5000,
        lineIndex: 4,
        text: "Signal flashing red and white",
        words: [
          { text: "Signal ", startTime: 26500, duration: 1000 },
          { text: "flashing ", startTime: 27500, duration: 1000 },
          { text: "red ", startTime: 28500, duration: 600 },
          { text: "and ", startTime: 29100, duration: 400 },
          { text: "white", startTime: 29500, duration: 2000 }
        ]
      },
      {
        startTime: 32000,
        duration: 5000,
        lineIndex: 5,
        text: "Will we make it through the night",
        words: [
          { text: "Will ", startTime: 32000, duration: 600 },
          { text: "we ", startTime: 32600, duration: 400 },
          { text: "make ", startTime: 33000, duration: 600 },
          { text: "it ", startTime: 33600, duration: 400 },
          { text: "through ", startTime: 34000, duration: 600 },
          { text: "the ", startTime: 34600, duration: 400 },
          { text: "night", startTime: 35000, duration: 2000 }
        ]
      }
    ],
    pitchBlocks: [
      // Line 0
      { startTime: 2500, duration: 600, pitch: 57 },
      { startTime: 3100, duration: 900, pitch: 60 },
      { startTime: 4000, duration: 500, pitch: 62 },
      { startTime: 4500, duration: 1100, pitch: 64 },
      { startTime: 5600, duration: 1900, pitch: 57 },
      // Line 1
      { startTime: 8000, duration: 900, pitch: 60 },
      { startTime: 8900, duration: 800, pitch: 62 },
      { startTime: 9700, duration: 300, pitch: 64 },
      { startTime: 10000, duration: 300, pitch: 65 },
      { startTime: 10300, duration: 700, pitch: 67 },
      { startTime: 11000, duration: 400, pitch: 65 },
      { startTime: 11400, duration: 400, pitch: 64 },
      { startTime: 11800, duration: 1700, pitch: 62 },
      // Line 2
      { startTime: 14000, duration: 600, pitch: 57 },
      { startTime: 14600, duration: 400, pitch: 57 },
      { startTime: 15000, duration: 800, pitch: 60 },
      { startTime: 15800, duration: 800, pitch: 62 },
      { startTime: 16600, duration: 400, pitch: 60 },
      { startTime: 17000, duration: 2000, pitch: 57 },
      // Line 3
      { startTime: 20000, duration: 600, pitch: 57 },
      { startTime: 20600, duration: 400, pitch: 57 },
      { startTime: 21000, duration: 800, pitch: 60 },
      { startTime: 21800, duration: 1100, pitch: 62 },
      { startTime: 22900, duration: 2600, pitch: 64 },
      // Line 4
      { startTime: 26500, duration: 1000, pitch: 67 },
      { startTime: 27500, duration: 1000, pitch: 65 },
      { startTime: 28500, duration: 600, pitch: 64 },
      { startTime: 29100, duration: 400, pitch: 62 },
      { startTime: 29500, duration: 2000, pitch: 60 },
      // Line 5
      { startTime: 32000, duration: 600, pitch: 64 },
      { startTime: 32600, duration: 400, pitch: 65 },
      { startTime: 33000, duration: 600, pitch: 67 },
      { startTime: 33600, duration: 400, pitch: 69 },
      { startTime: 34000, duration: 600, pitch: 67 },
      { startTime: 34600, duration: 400, pitch: 65 },
      { startTime: 35000, duration: 2000, pitch: 64 }
    ]
  },
  {
    id: "chromatic_bloom",
    title: "Chromatic Bloom",
    artist: "Prism Core",
    duration: 44,
    bpm: 95,
    description: "Bright crystalline arpeggios that open up into waves of high-contrast color.",
    albumArt: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=400&auto=format&fit=crop&q=80",
    lyricToken: "tok_chromatic_bloom_9210",
    krcLines: [
      {
        startTime: 2000,
        duration: 4500,
        lineIndex: 0,
        text: "Colors burst when morning comes",
        words: [
          { text: "Colors ", startTime: 2000, duration: 800 },
          { text: "burst ", startTime: 2800, duration: 600 },
          { text: "when ", startTime: 3400, duration: 500 },
          { text: "morning ", startTime: 3900, duration: 900 },
          { text: "comes", startTime: 4800, duration: 1700 }
        ]
      },
      {
        startTime: 7500,
        duration: 4500,
        lineIndex: 1,
        text: "Waking up the sleeping drums",
        words: [
          { text: "Waking ", startTime: 7500, duration: 900 },
          { text: "up ", startTime: 8400, duration: 500 },
          { text: "the ", startTime: 8900, duration: 400 },
          { text: "sleeping ", startTime: 9300, duration: 900 },
          { text: "drums", startTime: 10200, duration: 1800 }
        ]
      },
      {
        startTime: 13000,
        duration: 5000,
        lineIndex: 2,
        text: "Every prism reflects the light",
        words: [
          { text: "Every ", startTime: 13000, duration: 800 },
          { text: "prism ", startTime: 13800, duration: 700 },
          { text: "reflects ", startTime: 14500, duration: 900 },
          { text: "the ", startTime: 15400, duration: 400 },
          { text: "light", startTime: 15800, duration: 2200 }
        ]
      },
      {
        startTime: 19000,
        duration: 5000,
        lineIndex: 3,
        text: "Shining clean and laser bright",
        words: [
          { text: "Shining ", startTime: 19000, duration: 900 },
          { text: "clean ", startTime: 19900, duration: 700 },
          { text: "and ", startTime: 20600, duration: 400 },
          { text: "laser ", startTime: 21000, duration: 800 },
          { text: "bright", startTime: 21800, duration: 2200 }
        ]
      },
      {
        startTime: 25000,
        duration: 5500,
        lineIndex: 4,
        text: "A silent bloom across the sky",
        words: [
          { text: "A ", startTime: 25000, duration: 400 },
          { text: "silent ", startTime: 25400, duration: 900 },
          { text: "bloom ", startTime: 26300, duration: 900 },
          { text: "across ", startTime: 27200, duration: 800 },
          { text: "the ", startTime: 28000, duration: 400 },
          { text: "sky", startTime: 28400, duration: 2100 }
        ]
      }
    ],
    pitchBlocks: [
      // Line 0
      { startTime: 2000, duration: 800, pitch: 65 },
      { startTime: 2800, duration: 600, pitch: 67 },
      { startTime: 3400, duration: 500, pitch: 69 },
      { startTime: 3900, duration: 900, pitch: 71 },
      { startTime: 4800, duration: 1700, pitch: 72 },
      // Line 1
      { startTime: 7500, duration: 900, pitch: 65 },
      { startTime: 8400, duration: 500, pitch: 64 },
      { startTime: 8900, duration: 400, pitch: 62 },
      { startTime: 9300, duration: 900, pitch: 60 },
      { startTime: 10200, duration: 1800, pitch: 57 },
      // Line 2
      { startTime: 13000, duration: 800, pitch: 60 },
      { startTime: 13800, duration: 700, pitch: 64 },
      { startTime: 14500, duration: 900, pitch: 67 },
      { startTime: 15400, duration: 400, pitch: 69 },
      { startTime: 15800, duration: 2200, pitch: 72 },
      // Line 3
      { startTime: 19000, duration: 900, pitch: 72 },
      { startTime: 19900, duration: 700, pitch: 69 },
      { startTime: 20600, duration: 400, pitch: 67 },
      { startTime: 21000, duration: 800, pitch: 64 },
      { startTime: 21800, duration: 2200, pitch: 60 },
      // Line 4
      { startTime: 25000, duration: 400, pitch: 62 },
      { startTime: 25400, duration: 900, pitch: 64 },
      { startTime: 26300, duration: 900, pitch: 65 },
      { startTime: 27200, duration: 800, pitch: 67 },
      { startTime: 28000, duration: 400, pitch: 69 },
      { startTime: 28400, duration: 2100, pitch: 72 }
    ]
  }
];

// Implements getStandardPitch
export function getStandardPitch(song: Song, timeMs: number): number | null {
  // Find standard pitch block overlapping this exact millisecond
  const matchingBlock = song.pitchBlocks.find(
    (b) => timeMs >= b.startTime && timeMs <= b.startTime + b.duration
  );
  return matchingBlock ? matchingBlock.pitch : null;
}

// Converts MIDI note (e.g. 60) to corresponding Hertz frequency
export function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Converts Hertz frequency (e.g. 261.63) to corresponding standard MIDI note
export function hzToMidi(hz: number): number {
  if (hz <= 0) return 0;
  return Math.round(69 + 12 * Math.log2(hz / 440));
}

// Implements a real-time Autocorrelation algorithm on raw mic buffer
export function performAutocorrelation(
  buffer: Float32Array,
  sampleRate: number
): number | null {
  const SIZE = buffer.length;

  // Verify there is enough standard sound pressure (RMS volume) before trying to locate a pitch
  let rms = 0;
  for (let i = 0; i < SIZE; i++) {
    rms += buffer[i] * buffer[i];
  }
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.015) {
    return null; // Silent room background noise -> skip pitch analysis
  }

  // Trim silent start and endpoints to locate active signal
  let r1 = 0;
  let r2 = SIZE - 1;
  const thres = 0.002;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buffer[i]) < thres) {
      r1 = i;
    } else {
      break;
    }
  }
  for (let i = SIZE - 1; i >= SIZE / 2; i--) {
    if (Math.abs(buffer[i]) < thres) {
      r2 = i;
    } else {
      break;
    }
  }
  const signal = buffer.subarray(r1, r2);
  const len = signal.length;
  if (len < 64) return null; // Insufficient active signal length

  const c = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    for (let j = 0; j < len - i; j++) {
      c[i] += signal[j] * signal[j + i];
    }
  }

  // Find first zero deflection/valley
  let d = 0;
  while (d < len - 1 && c[d] > c[d + 1]) {
    d++;
  }

  // Find highest subsequent peak
  let maxVal = -1;
  let maxPos = -1;
  for (let j = d; j < len; j++) {
    if (c[j] > maxVal) {
      maxVal = c[j];
      maxPos = j;
    }
  }

  let periodicalT0 = maxPos;
  const confidence = maxVal / c[0];

  // Return estimated fundamental vocal frequency if confidence fits
  if (confidence > 0.45 && periodicalT0 > 0) {
    const frequency = sampleRate / periodicalT0;
    // Human vocal range: roughly 60 Hz to 1200 Hz
    if (frequency >= 60 && frequency <= 1200) {
      return frequency;
    }
  }

  return null;
}

// Implements getCurrentPitch by leveraging AnalyserNode and Autocorrelation, with intelligent fallbacks
export function getCurrentPitch(
  analyser: AnalyserNode | null,
  audioCtx: AudioContext | null,
  targetMidi: number | null,
  isSimulatedMode: boolean = false,
  simProgress: number = 0
): { midi: number; hz: number; isMatched: boolean } | null {
  // If simulated singer/assistant mode is active, simulate active vocal tracking with clean frequency oscillations
  if (isSimulatedMode) {
    if (!targetMidi) return null;
    // Add small realistic vocal vibrato/instability (around +- 0.3 semitones)
    const vibrato = Math.sin(simProgress / 120) * 0.25;
    // Introduce micro-latency drift in response time
    const drift = Math.cos(simProgress / 400) * 0.15;
    const finalMidi = targetMidi + vibrato + drift;
    const finalHz = midiToHz(finalMidi);
    return {
      midi: finalMidi,
      hz: finalHz,
      isMatched: true
    };
  }

  // Check physical audio analyzer
  if (!analyser || !audioCtx) return null;

  const bufferLength = analyser.fftSize;
  const dataArray = new Float32Array(bufferLength);
  analyser.getFloatTimeDomainData(dataArray);

  const freq = performAutocorrelation(dataArray, audioCtx.sampleRate);
  if (freq === null) return null;

  const detectedMidi = 69 + 12 * Math.log2(freq / 440);

  // Consider vocal match successful if the user's voice is within 1.5 semitones of the target melody notes
  let isMatched = false;
  if (targetMidi !== null) {
    isMatched = Math.abs(detectedMidi - targetMidi) <= 1.5;
  }

  return {
    midi: detectedMidi,
    hz: freq,
    isMatched
  };
}

// Implements score calculations for individual lines: getPreviousScore
export function getPreviousScore(
  song: Song,
  lineIndex: number,
  vocalHistory: { time: number; midi: number; isMatched: boolean }[]
): number {
  const line = song.krcLines[lineIndex];
  if (!line) return 0;

  // Filter vocal points recorded during this line's absolute active lifetime
  const linePoints = vocalHistory.filter(
    (pt) => pt.time >= line.startTime && pt.time <= line.startTime + line.duration
  );

  if (linePoints.length === 0) return 0;

  // Percent of pitch alignments that fell inside target semitone bounds
  const matchedPoints = linePoints.filter((pt) => pt.isMatched);
  const accuracy = Math.round((matchedPoints.length / linePoints.length) * 100);
  return accuracy;
}

// Implements the final accumulated score evaluation: getTotalScore
export function getTotalScore(
  savedLineScores: Record<number, number>,
  totalExpectedLines: number
): { pointTotal: number; rank: "S" | "A" | "B" | "C" | "F" } {
  let scoreSum = 0;
  let linesCounted = 0;

  for (let i = 0; i < totalExpectedLines; i++) {
    if (savedLineScores[i] !== undefined) {
      scoreSum += savedLineScores[i];
      linesCounted++;
    }
  }

  const average = linesCounted > 0 ? Math.round(scoreSum / linesCounted) : 0;

  let rank: "S" | "A" | "B" | "C" | "F" = "F";
  if (average >= 90) rank = "S";
  else if (average >= 78) rank = "A";
  else if (average >= 60) rank = "B";
  else if (average >= 45) rank = "C";

  return {
    pointTotal: average,
    rank
  };
}

// Implements requestResource to mimic network dispatching for a song resource request
export async function requestResource(
  songId: string,
  onProgress: (progress: number) => void
): Promise<boolean> {
  return new Promise((resolve) => {
    let current = 0;
    const interval = setInterval(() => {
      current += Math.floor(Math.random() * 8) + 5;
      if (current >= 100) {
        current = 100;
        onProgress(100);
        clearInterval(interval);
        resolve(true);
      } else {
        onProgress(current);
      }
    }, 150);
  });
}

// Implements getKrcLyricByToken
export function getKrcLyricByToken(token: string): KrcLine[] {
  const song = SONG_LIBRARY.find((s) => s.lyricToken === token);
  return song ? song.krcLines : [];
}

// Converts MIDI Note value to standard visual western music pitch letter notation (e.g. C4, D#5)
export function getNoteNotation(midi: number): string {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const noteIndex = Math.round(midi) % 12;
  const octave = Math.floor(Math.round(midi) / 12) - 1;
  return `${names[noteIndex]}${octave}`;
}
