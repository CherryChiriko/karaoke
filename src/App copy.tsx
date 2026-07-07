import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Music,
  Award,
  Terminal,
  X,
  Radio,
  ListRestart,
} from "lucide-react";
import {
  SONG_LIBRARY,
  getStandardPitch,
  getCurrentPitch,
  getTotalScore,
  requestResource,
  getNoteNotation,
  midiToHz,
} from "./lib/sdk";
import { Song, PitchPoint, QueueState, ScoreState } from "./types";
import { CornerFrame } from "./components/General/ui/CornerFrame";
import { LyricsSection } from "./components/Lyrics/components/LyricsSection";
import { SongQueueSection } from "./components/Songs/components/SongQueueSection";

import { MicInputSection } from "./components/Mic/components/MicInputSection";
import { useAudioRecorder } from "./components/Mic/hooks/useAudioRecorder";
import { PitchSection } from "./components/Pitch/components/PitchSection";
import { Header } from "./components/Header/Header";

export default function App() {
  // Navigation & Preferences
  const [activeTab, setActiveTab] = useState<"SING" | "HISTORY">("SING");
  const [showHelp, setShowHelp] = useState<boolean>(false);

  // Core Room State
  const [activeSong, setActiveSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0); // elapsed song milliseconds
  const [tempoBpm, setTempoBpm] = useState<number>(120);

  // Queue State for individual library songs
  const [queueStates, setQueueStates] = useState<
    Record<string, { state: QueueState; progress: number }>
  >({
    neon_drift: { state: "IDLE", progress: 0 },
    midnight_circuit: { state: "IDLE", progress: 0 },
    chromatic_bloom: { state: "IDLE", progress: 0 },
  });

  // Physical Microphoning & Simulated Vocalist Toggle
  const [isMicEnabled, setIsMicEnabled] = useState<boolean>(false);
  const { micVolume, micStatusLog, startMicNode, stopMicNode } =
    useAudioRecorder(isMicEnabled, setIsMicEnabled);

  const [isSimulatedSinger, setIsSimulatedSinger] = useState<boolean>(true); // Simulated is active by default for pleasant evaluation out-of-the-box

  // Pitch tracking results
  const [detectedPitch, setDetectedPitch] = useState<{
    midi: number;
    hz: number;
    isMatched: boolean;
  } | null>(null);
  const [targetMidi, setTargetMidi] = useState<number | null>(null);
  const [userPitchHistory, setUserPitchHistory] = useState<PitchPoint[]>([]);

  // Scoring details
  const [scoreState, setScoreState] = useState<ScoreState>({
    currentLineIndex: -1,
    lineScores: {},
    totalScore: 0,
    rank: "--",
  });
  const [showScoreModal, setShowScoreModal] = useState<boolean>(false);

  // Completed Session Log to preserve scores
  const [sessionLogs, setSessionLogs] = useState<
    {
      songTitle: string;
      artist: string;
      date: string;
      score: number;
      rank: string;
    }[]
  >([
    {
      songTitle: "Neon Drift",
      artist: "Synthia Vane",
      date: "June 12, 2026",
      score: 88,
      rank: "A",
    },
    {
      songTitle: "Midnight Circuit",
      artist: "Pixel Pulse",
      date: "June 13, 2026",
      score: 64,
      rank: "B",
    },
  ]);

  // Audio Context Ref structure
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // References for Canvas Size Adaptation
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canvasDimensions, setCanvasDimensions] = useState({
    width: 800,
    height: 280,
  });

  // Synced refs to prevent closures from trapping stale states in requestAnimationFrame hook loops
  const stateRef = useRef({
    isPlaying: false,
    currentTime: 0,
    activeSong: null as Song | null,
    isSimulatedSinger: true,
    isMicEnabled: false,
    userPitchHistory: [] as PitchPoint[],
    detectedPitch: null as {
      midi: number;
      hz: number;
      isMatched: boolean;
    } | null,
    scoreState: {
      currentLineIndex: -1,
      lineScores: {} as Record<number, number>,
    },
  });

  useEffect(() => {
    stateRef.current.isPlaying = isPlaying;
    stateRef.current.currentTime = currentTime;
    stateRef.current.activeSong = activeSong;
    stateRef.current.isSimulatedSinger = isSimulatedSinger;
    stateRef.current.isMicEnabled = isMicEnabled;
    stateRef.current.userPitchHistory = userPitchHistory;
    stateRef.current.detectedPitch = detectedPitch;
    stateRef.current.scoreState = {
      currentLineIndex: scoreState.currentLineIndex,
      lineScores: scoreState.lineScores,
    };
  }, [
    isPlaying,
    currentTime,
    activeSong,
    isSimulatedSinger,
    isMicEnabled,
    userPitchHistory,
    detectedPitch,
    scoreState,
  ]);

  // Adapt to Canvas Div modifications using standard ResizeObserver
  useEffect(() => {
    if (!canvasContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setCanvasDimensions({
          width: Math.max(width, 400),
          height: Math.max(height, 200),
        });
      }
    });
    observer.observe(canvasContainerRef.current);
    return () => observer.disconnect();
  }, []);

  // Ordering handler calling requestResource
  const handleOrderSong = async (songId: string) => {
    if (queueStates[songId]?.state !== "IDLE") return;

    setQueueStates((prev) => ({
      ...prev,
      [songId]: { state: "DOWNLOADING", progress: 0 },
    }));

    const result = await requestResource(songId, (p) => {
      setQueueStates((prev) => ({
        ...prev,
        [songId]: { state: "DOWNLOADING", progress: p },
      }));
    });

    if (result) {
      setQueueStates((prev) => ({
        ...prev,
        [songId]: { state: "READY", progress: 100 },
      }));
    }
  };

  // Loading/Selecting song to sing
  const handleSelectSong = (song: Song) => {
    setActiveSong(song);
    setTempoBpm(song.bpm);
    setCurrentTime(0);
    setUserPitchHistory([]);
    setDetectedPitch(null);
    setTargetMidi(null);
    setIsPlaying(false);
    setShowScoreModal(false);
    setScoreState({
      currentLineIndex: -1,
      lineScores: {},
      totalScore: 0,
      rank: "--",
    });
  };

  // Playback loop handling
  useEffect(() => {
    let lastTime = performance.now();

    const loop = (now: number) => {
      if (!stateRef.current.isPlaying) {
        lastTime = now;
        animationFrameRef.current = requestAnimationFrame(loop);
        return;
      }

      const delta = now - lastTime;
      lastTime = now;

      const newTime = stateRef.current.currentTime + delta;

      // Stop and calculate final score when song ends
      if (
        stateRef.current.activeSong &&
        newTime >= stateRef.current.activeSong.duration * 1000
      ) {
        setIsPlaying(false);
        setCurrentTime(stateRef.current.activeSong.duration * 1000);
        handleSongFinished();
        return;
      }

      setCurrentTime(newTime);

      // Perform real-time pitch matching & target checks
      if (stateRef.current.activeSong) {
        const standardMidi = getStandardPitch(
          stateRef.current.activeSong,
          newTime,
        );
        setTargetMidi(standardMidi);

        let pitchResult = null;
        if (
          stateRef.current.isMicEnabled &&
          analyserRef.current &&
          audioCtxRef.current
        ) {
          // Hardware vocal detection (Autocorrelation)
          pitchResult = getCurrentPitch(
            analyserRef.current,
            audioCtxRef.current,
            standardMidi,
            false,
          );
        } else if (stateRef.current.isSimulatedSinger) {
          // Autopilot simulation coordinates
          pitchResult = getCurrentPitch(
            null,
            null,
            standardMidi,
            true,
            newTime,
          );
        }

        if (pitchResult) {
          setDetectedPitch(pitchResult);

          // Append points dynamically to the historical feedback line
          setUserPitchHistory((prev) => {
            const trimmed = prev.filter((p) => p.time > newTime - 10000); // keep past 10 seconds of history points for memory optimization
            return [
              ...trimmed,
              {
                time: newTime,
                pitch: pitchResult.midi,
                isMatched: pitchResult.isMatched,
              },
            ];
          });
        } else {
          setDetectedPitch(null);
        }

        // On-the-fly lyrics sentence-by-sentence evaluator:
        // Detect if playhead has advanced past a KrcLine line boundary!
        const lines = stateRef.current.activeSong.krcLines;
        const currentActiveIdx = lines.findIndex(
          (line) =>
            newTime >= line.startTime &&
            newTime <= line.startTime + line.duration,
        );

        const currentLineIdx = stateRef.current.scoreState.currentLineIndex;

        // Verify if a previous line has been concluded
        if (currentLineIdx !== -1 && currentActiveIdx !== currentLineIdx) {
          const oldLine = lines[currentLineIdx];
          // Check if playhead has passed beyond the line endpoint
          if (
            newTime > oldLine.startTime + oldLine.duration &&
            stateRef.current.scoreState.lineScores[currentLineIdx] === undefined
          ) {
            // Compute the getPreviousScore performance and cache it
            // const lineAccuracy = getPreviousScore(
            //   stateRef.current.activeSong,
            //   currentLineIdx,
            //   stateRef.current.userPitchHistory
            // );
            const lineAccuracy = 0;

            setScoreState((prev) => {
              const updatedScores = {
                ...prev.lineScores,
                [currentLineIdx]: lineAccuracy,
              };

              // Tally running score
              const activeCount = Object.keys(updatedScores).length;
              let average = 0;
              if (activeCount > 0) {
                const totalSum = Object.values(updatedScores).reduce(
                  (a, b) => a + b,
                  0,
                );
                average = Math.round(totalSum / activeCount);
              }

              return {
                ...prev,
                lineScores: updatedScores,
                totalScore: average,
              };
            });
          }
        }

        if (currentActiveIdx !== -1 && currentActiveIdx !== currentLineIdx) {
          setScoreState((prev) => ({
            ...prev,
            currentLineIndex: currentActiveIdx,
          }));
        }
      }

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [activeSong]);

  const handleSongFinished = () => {
    if (!activeSong) return;

    // Fill in missing line scores with 0 if singer skipped or missed them
    const finalScores = { ...scoreState.lineScores };
    activeSong.krcLines.forEach((_, idx) => {
      if (finalScores[idx] === undefined) {
        finalScores[idx] = 0;
      }
    });

    // Obtain actual game results via SDK getTotalScore
    const evaluation = getTotalScore(finalScores, activeSong.krcLines.length);

    setScoreState((prev) => ({
      ...prev,
      lineScores: finalScores,
      totalScore: evaluation.pointTotal,
      rank: evaluation.rank,
    }));

    // Record logs to save the performance
    setSessionLogs((prev) => [
      {
        songTitle: activeSong.title,
        artist: activeSong.artist,
        date: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        score: evaluation.pointTotal,
        rank: evaluation.rank,
      },
      ...prev,
    ]);

    setShowScoreModal(true);
  };

  // Rendering the dynamic pitch grids on the 2D Canvas in real-time

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !activeSong) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear background
    ctx.fillStyle = "#090e11";
    ctx.fillRect(0, 0, canvasDimensions.width, canvasDimensions.height);

    // Draw background matrix gridlines
    ctx.strokeStyle = "rgba(0, 243, 255, 0.04)";
    ctx.lineWidth = 1;

    // Draw horizontal octave rows
    const minMidi = 54;
    const maxMidi = 76;
    const midiSpan = maxMidi - minMidi;

    const getYCoordinate = (midiValue: number) => {
      const padding = 20;
      const usableHeight = canvasDimensions.height - 2 * padding;
      const ratio = (midiValue - minMidi) / midiSpan;
      return canvasDimensions.height - padding - ratio * usableHeight;
    };

    // Draw staff pitch guidelines
    for (let m = minMidi; m <= maxMidi; m++) {
      const isC = m % 12 === 0;
      const y = getYCoordinate(m);

      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasDimensions.width, y);
      ctx.strokeStyle = isC
        ? "rgba(0, 243, 255, 0.12)"
        : "rgba(0, 243, 255, 0.03)";
      ctx.lineWidth = isC ? 1.5 : 1;
      ctx.stroke();

      // Show musical key indicators
      if (isC || m % 12 === 4 || m % 12 === 7) {
        ctx.fillStyle = "rgba(0, 243, 255, 0.35)";
        ctx.font = "8px monospace";
        ctx.fillText(getNoteNotation(m), 12, y - 2);
      }
    }

    // Set locked tracking bar coordinates at 30% from left
    const trackingX = canvasDimensions.width * 0.3;

    // Calculate time mapping to pixel widths (6 seconds = full canvas width)
    const pixelsPerMs = canvasDimensions.width / 6000;

    // Draw horizontal Standard Song Note Blocks travel
    activeSong.pitchBlocks.forEach((block) => {
      const startOffset = block.startTime - currentTime;
      const blockWidth = block.duration * pixelsPerMs;
      const x = trackingX + startOffset * pixelsPerMs;
      const y = getYCoordinate(block.pitch);

      // Clip out of screen
      if (x + blockWidth < 0 || x > canvasDimensions.width) return;

      // Draw shiny neon block
      const heightVal = 8;
      ctx.fillStyle = "rgba(0, 243, 255, 0.15)";
      ctx.strokeStyle = "rgba(0, 243, 255, 0.7)";
      ctx.lineWidth = 1.5;

      // Rounded rectangle for note block styling
      ctx.beginPath();
      ctx.roundRect
        ? ctx.roundRect(x, y - heightVal / 2, blockWidth, heightVal, 3)
        : ctx.rect(x, y - heightVal / 2, blockWidth, heightVal);
      ctx.fill();
      ctx.stroke();

      // Glowing overlay if target note overlaps playhead
      if (
        currentTime >= block.startTime &&
        currentTime <= block.startTime + block.duration
      ) {
        ctx.fillStyle = "rgba(0, 243, 255, 0.3)";
        ctx.beginPath();
        ctx.roundRect
          ? ctx.roundRect(x, y - heightVal / 2, blockWidth, heightVal, 3)
          : ctx.rect(x, y - heightVal / 2, blockWidth, heightVal);
        ctx.fill();
      }
    });

    // Draw voice historical trails
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    let isPathActive = false;

    userPitchHistory.forEach((pt) => {
      const ptOffset = pt.time - currentTime;
      const x = trackingX + ptOffset * pixelsPerMs;
      const y = getYCoordinate(pt.pitch);

      if (x >= 0 && x <= canvasDimensions.width) {
        if (!isPathActive) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          isPathActive = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
    });

    if (isPathActive) {
      ctx.strokeStyle = "#e11d48"; // Vibrant Rose/Magenta vocal tracker line
      ctx.stroke();
    }

    // Draw trailing microphone vocal nodes for a futuristic scatter-glowing look
    userPitchHistory.forEach((pt) => {
      const ptOffset = pt.time - currentTime;
      const x = trackingX + ptOffset * pixelsPerMs;
      const y = getYCoordinate(pt.pitch);

      if (x >= 0 && x <= canvasDimensions.width) {
        ctx.beginPath();
        ctx.arc(x, y, pt.isMatched ? 2.5 : 2, 0, 2 * Math.PI);
        ctx.fillStyle = pt.isMatched ? "#10b981" : "#f43f5e"; // green if accurately hit, pink if wrong
        ctx.fill();
      }
    });

    // Live Vertical Blue Playback indicator line (glowing)
    ctx.beginPath();
    ctx.moveTo(trackingX, 0);
    ctx.lineTo(trackingX, canvasDimensions.height);
    ctx.strokeStyle = "rgba(0, 243, 255, 0.85)";
    ctx.lineWidth = 2.5;
    ctx.shadowColor = "#00f3ff";
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.shadowBlur = 0; // Reset shadow blurs to avoid performance lags on standard browsers

    // Draw active live floating notes indicators on the tracking line itself
    if (detectedPitch) {
      const userY = getYCoordinate(detectedPitch.midi);
      ctx.beginPath();
      ctx.arc(trackingX, userY, 6, 0, 2 * Math.PI);
      ctx.fillStyle = detectedPitch.isMatched ? "#059669" : "#e11d48";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();

      // Show real-time indicator line connecting target to voice if singing on-track
      if (targetMidi !== null) {
        const targetY = getYCoordinate(targetMidi);
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(trackingX, targetY);
        ctx.lineTo(trackingX, userY);
        ctx.strokeStyle = "rgba(255,255,255,0.4)";
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    if (targetMidi !== null) {
      const targetY = getYCoordinate(targetMidi);
      ctx.beginPath();
      ctx.arc(trackingX, targetY, 5, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(0, 243, 255, 1)";
      ctx.fill();
    }
  }, [
    currentTime,
    activeSong,
    userPitchHistory,
    detectedPitch,
    targetMidi,
    canvasDimensions,
  ]);

  return (
    <div
      className="min-h-screen bg-[#030708] text-gray-100 flex flex-col font-sans select-none overflow-x-hidden antialiased selection:bg-cyan-500/30 selection:text-white"
      id="main_karaoke_room_container"
    >
      {/* HEADER SECTION */}

      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sessionLogs={sessionLogs}
        setShowHelp={setShowHelp}
      />

      {/* METRIC TICKER TICK-STREAM BAR */}
      {/* <div
        className="bg-[#04080a] border-b border-cyan-500/10 px-6 py-2 flex items-center gap-6 overflow-x-auto whitespace-nowrap scrollbar-none font-mono text-[10px] text-slate-400 uppercase shrink-0"
        id="ticker_stream_panel"
      >
        <span className="text-slate-500 font-bold tracking-wider shrink-0 mr-2 flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
          - STANDARD PITCH STREAM - ONLINE
        </span>
        <div className="h-3 w-px bg-slate-800 shrink-0" />

        <div className="flex items-center gap-2 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <span>KARAOKE OS V1.0</span>
        </div>
        <div className="h-3 w-px bg-slate-800 shrink-0" />

        <div className="flex items-center gap-2 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <span>MIC LATENCY ≈ 18MS</span>
        </div>
        <div className="h-3 w-px bg-slate-800 shrink-0" />

        <div className="flex items-center gap-2 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <span>KRC LYRIC SYNC LOCKED</span>
        </div>
        <div className="h-3 w-px bg-slate-800 shrink-0" />

        <div className="flex items-center gap-2 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <span>BPM SYNC: GREEN</span>
        </div>
        <div className="h-3 w-px bg-slate-800 shrink-0" />

        <div className="flex items-center gap-2 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <span>ZEGO CLOUD - STREAM STATE: ACTIVE CAPTURING</span>
        </div>
      </div> */}

      {activeTab === "SING" ? (
        <div className="grow p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-hidden">
          {/* LEFT PANEL - ALBUM ART & PLAYBACK PERFORMANCE COVERS */}
          <section
            className="lg:col-span-1 bg-[#060b0d] border border-cyan-500/10 rounded-xl flex flex-col overflow-hidden relative shadow-[0_4px_24px_rgba(3,7,8,0.4)]"
            id="left_metadata_panel"
          >
            <CornerFrame />

            <div className="p-4 border-b border-cyan-500/10 bg-[#090f11] flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-slate-300 tracking-wider">
                TRACK METADATA
              </span>
              <span className="font-mono text-[10px] text-cyan-400 font-semibold uppercase">
                ACCOMPANIMENT PORT
              </span>
            </div>

            <div className="grow p-6 flex flex-col justify-between overflow-y-auto min-h-[300px]">
              {!activeSong ? (
                <div className="my-auto text-center flex flex-col items-center justify-center p-4">
                  <div className="w-16 h-16 rounded-full border border-dashed border-slate-700 flex items-center justify-center text-slate-400 mb-4 animate-spin-slow">
                    <Music className="w-6 h-6 text-slate-500" />
                  </div>
                  <span className="font-mono text-xs font-extrabold tracking-widest text-[#00f3ff] block mb-2 uppercase">
                    NO TRACK LOADED
                  </span>
                  <p className="text-gray-500 text-xs font-mono max-w-[200px] leading-relaxed">
                    Select a song from the library queue on the right panel to
                    begin →
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-6 md:h-full justify-between">
                  {/* Active Song Banner & Card */}
                  <div className="flex flex-col gap-4">
                    <div className="relative group rounded-lg overflow-hidden border border-slate-800 bg-[#030607]">
                      <img
                        src={activeSong.albumArt}
                        alt={activeSong.title}
                        className="w-full aspect-video object-cover brightness-75 group-hover:brightness-90 transition-all duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#060b0d] to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                        <span className="px-2 py-0.5 bg-cyan-950/90 border border-cyan-400/30 text-[#00f3ff] rounded font-mono text-[9px] font-bold uppercase">
                          {activeSong.bpm} BPM
                        </span>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 font-mono uppercase block">
                            DURATION
                          </span>
                          <span className="text-xs font-mono font-bold text-white block">
                            {Math.floor(activeSong.duration / 60)}:
                            {String(activeSong.duration % 60).padStart(2, "0")}s
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="border-l-2 border-[#00f3ff] pl-3">
                      <h3 className="font-bold text-lg text-white font-mono leading-tight">
                        {activeSong.title}
                      </h3>
                      <p className="text-xs text-cyan-400 font-mono tracking-wider">
                        {activeSong.artist}
                      </p>
                    </div>

                    <p className="text-[11px] text-slate-400 font-mono leading-relaxed bg-slate-950/40 p-3 rounded border border-slate-800/60">
                      {activeSong.description}
                    </p>
                  </div>

                  {/* Playback Controls and Simulated vocalist switches */}
                  <div className="bg-[#04080a] p-4 rounded-lg border border-cyan-500/15 flex flex-col gap-4 justify-end mt-auto">
                    <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
                      <span>ELAPSED PLAYTIME</span>
                      <span className="text-cyan-400 font-bold">
                        {(currentTime / 1000).toFixed(1)}s /{" "}
                        {activeSong.duration}.0s
                      </span>
                    </div>

                    {/* Simple Progress Bar */}
                    <div className="w-full bg-[#030607] h-1.5 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="bg-[#00f3ff] h-full shadow-[0_0_8px_#00f3ff] transition-all duration-75"
                        style={{
                          width: `${Math.min(100, (currentTime / (activeSong.duration * 1000)) * 100)}%`,
                        }}
                      />
                    </div>

                    {/* Standard Player Buttons */}
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => {
                          setIsPlaying(!isPlaying);
                          if (currentTime >= activeSong.duration * 1000) {
                            setCurrentTime(0);
                            setUserPitchHistory([]);
                          }
                        }}
                        className={`py-2 rounded font-mono text-[10px] font-bold tracking-wider flex items-center justify-center gap-1.5 transition-all outline-none border ${
                          isPlaying
                            ? "bg-amber-950/40 hover:bg-amber-900/30 border-amber-600/40 text-amber-300"
                            : "bg-[#0b2126] hover:bg-[#11323a] border-cyan-500/40 text-cyan-300"
                        }`}
                        id="play_pause_button"
                      >
                        {isPlaying ? (
                          <>
                            <Pause className="w-3.5 h-3.5" /> PAUSE
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" /> INITIATE
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setCurrentTime(0);
                          setUserPitchHistory([]);
                          setDetectedPitch(null);
                          setScoreState((prev) => ({
                            ...prev,
                            lineScores: {},
                            totalScore: 0,
                            rank: "--",
                          }));
                        }}
                        className="py-2 bg-[#090f11] hover:bg-[#111c1f] text-slate-300 border border-slate-800 rounded font-mono text-[10px] font-bold tracking-wider flex items-center justify-center gap-1"
                        id="reset_song_button"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> REBOOT
                      </button>

                      <button
                        onClick={() => {
                          setIsPlaying(false);
                          setCurrentTime(0);
                          setDetectedPitch(null);
                          setTargetMidi(null);
                          setUserPitchHistory([]);
                          setActiveSong(null);
                          setShowScoreModal(false);
                          setScoreState({
                            currentLineIndex: -1,
                            lineScores: {},
                            totalScore: 0,
                            rank: "--",
                          });
                        }}
                        className="py-2 bg-[#1a0f10] hover:bg-[#251517] text-rose-300 border border-rose-950 rounded font-mono text-[10px] font-bold tracking-wider flex items-center justify-center gap-1"
                        id="unload_song_button"
                      >
                        <X className="w-3.5 h-3.5" /> EJECT
                      </button>
                    </div>

                    {/* Simulated Pitch Helper */}
                    <div className="flex items-center justify-between border-t border-slate-800 pt-3">
                      <div className="flex flex-col">
                        <span className="font-mono text-[9px] text-slate-300 font-bold uppercase">
                          AUTO-VOCAL ASSISTANT
                        </span>
                        <span className="text-[8px] text-slate-500 font-mono">
                          SIMULATE IDEAL SING LEVEL
                        </span>
                      </div>
                      <button
                        onClick={() => setIsSimulatedSinger(!isSimulatedSinger)}
                        className={`px-2.5 py-1 text-[9px] font-mono font-bold tracking-wider rounded border transition-all ${
                          isSimulatedSinger
                            ? "bg-cyan-500/10 border-cyan-400/40 text-[#00f3ff] shadow-[0_0_10px_rgba(6,182,212,0.1)]"
                            : "bg-slate-900 border-slate-800 text-slate-500"
                        }`}
                        id="toggle_simulator_button"
                      >
                        {isSimulatedSinger ? "SIM ACTIVE" : "SIM INACTIVE"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Realtime stats ticker in footer */}
            <div className="bg-[#030607] border-t border-cyan-500/10 p-3 font-mono text-[10px] flex items-center justify-between text-slate-500 shrink-0">
              <span>SYNC TIME: ONLINE</span>
              <span className="text-cyan-600 font-bold">128-BPM L-STATE</span>
            </div>
          </section>

          {/* MIDDLE SECTION - PITCH TIMELINE VIEW + SCROLLING TARGET NOTES BLOCK GRID */}
          <div className="lg:col-span-2 flex flex-col gap-6 overflow-hidden">
            {/* PITCH TIMELINE MONITOR */}
            <PitchSection
              activeSong={activeSong}
              canvasContainerRef={canvasContainerRef}
              canvasRef={canvasRef}
              canvasDimensions={canvasDimensions}
            />

            {/* TELEPROMPTER LYRIC DESCRIPTIONS SECTION */}
            {/* section> */}
            <LyricsSection
              activeSong={activeSong}
              currentTime={currentTime}
              userPitchHistory={userPitchHistory}
              isSimulatedSinger={isSimulatedSinger}
              scoreState={scoreState}
            />
          </div>

          {/* RIGHT PANEL - MIC INPUT AND REALT-TIME PITCH DELTAS & SONG DOWNLOADER */}
          <div className="lg:col-span-1 flex flex-col gap-6 overflow-hidden">
            {/* MIC INPUT UNIT */}
            <MicInputSection
              isMicEnabled={isMicEnabled}
              micVolume={micVolume}
              micStatusLog={micStatusLog}
              detectedPitch={detectedPitch}
              targetMidi={targetMidi}
              startMicNode={startMicNode}
              stopMicNode={stopMicNode}
              getNoteNotation={getNoteNotation}
              midiToHz={midiToHz}
            />

            {/* SONG QUEUE / DOWNLOAD ARCHITECTURE MODULE */}
            <SongQueueSection
              songLibrary={SONG_LIBRARY}
              queueStates={queueStates}
              activeSong={activeSong}
              handleOrderSong={handleOrderSong}
              handleSelectSong={handleSelectSong}
              setShowHelp={setShowHelp}
            />
          </div>
        </div>
      ) : (
        /* HISTORIC PERFORMANCE LOGS VIEW */
        <div className="grow p-6 overflow-y-auto flex flex-col items-center">
          <div
            className="w-full max-w-4xl bg-[#060b0d] border border-cyan-500/15 rounded-xl overflow-hidden relative shadow-2xl"
            id="history_sessions_page"
          >
            <CornerFrame />

            <div className="p-5 border-b border-cyan-500/10 bg-[#090f11] flex items-center justify-between">
              <span className="font-mono text-sm font-bold text-slate-300 tracking-wider flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-400" /> HISTORIC VOICE
                EVALUATION LOGS
              </span>
              <button
                onClick={() => setSessionLogs([])}
                className="px-3 py-1 text-[10px] hover:text-rose-400 font-mono font-bold hover:bg-rose-950/20 rounded border border-slate-800 hover:border-rose-950 transition-all flex items-center gap-1"
                id="clear_history_cta"
              >
                <ListRestart className="w-3.5 h-3.5" /> PURGE ARCHIVES
              </button>
            </div>

            <div className="p-6">
              {sessionLogs.length === 0 ? (
                <div className="text-center py-16 font-mono text-slate-500 flex flex-col items-center justify-center p-4">
                  <Award className="w-12 h-12 text-slate-800 mb-4" />
                  <span className="uppercase text-xs font-bold block mb-2 text-[#00f3ff]">
                    No Performance Data Recorded Yet
                  </span>
                  <p className="text-[11px] text-slate-600 max-w-[280px] leading-relaxed">
                    Set active mic/sim trackers and sing through any
                    accompaniment song track to store score evaluation cards!
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse font-mono text-xs">
                    <thead>
                      <tr className="border-b border-slate-800/80 text-cyan-400/80 uppercase">
                        <th className="py-3 px-4 font-bold tracking-wider">
                          ACCOMPANIMENT SONG
                        </th>
                        <th className="py-3 px-4 font-bold tracking-wider">
                          VOCALIST
                        </th>
                        <th className="py-3 px-4 font-bold tracking-wider">
                          ACCURACY
                        </th>
                        <th className="py-3 px-4 font-bold tracking-wider">
                          CUMULATIVE RANK
                        </th>
                        <th className="py-3 px-4 font-bold tracking-wider">
                          PERFORMANCE TIMELINE
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/60 text-slate-300">
                      {sessionLogs.map((log, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-slate-950/50 transition-colors"
                        >
                          <td className="py-3 px-4 font-bold text-white">
                            {log.songTitle}
                          </td>
                          <td className="py-3 px-4 text-slate-500 text-[11px]">
                            {log.artist}
                          </td>
                          <td className="py-3 px-4 font-bold text-emerald-400">
                            {log.score}% Accuracy
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black tracking-widest ${
                                log.rank === "S"
                                  ? "bg-amber-500/10 border border-amber-500/30 text-amber-400"
                                  : log.rank === "A"
                                    ? "bg-cyan-500/11 border border-cyan-500/30 text-[#00f3ff]"
                                    : "bg-slate-800 text-slate-400"
                              }`}
                            >
                              RANK {log.rank}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 text-[11px]">
                            {log.date}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-[#030607] p-4 text-slate-500 font-mono text-[10px] text-center border-t border-slate-900/80">
              * Historic rankings are cached in standard local program
              environments.
            </div>
          </div>
        </div>
      )}

      {/* END-OFS-SESSION PERFORMANCE ACHIEVEMENTS MODAL OVERLAY */}
      {showScoreModal && activeSong && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in"
          id="performance_evaluation_modal"
        >
          <div className="w-full max-w-md bg-[#070c0e] border border-cyan-500/30 rounded-2xl overflow-hidden relative shadow-[0_0_50px_rgba(6,182,212,0.25)] p-6 text-center animate-scale-up">
            <CornerFrame />

            <button
              onClick={() => setShowScoreModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-950 p-1.5 rounded-full border border-slate-800 transition-colors"
              id="close_modal_cta"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-16 h-16 rounded-full bg-cyan-950/40 border border-[#00f3ff]/30 flex items-center justify-center text-[#00f3ff] mx-auto mb-4 animate-bounce">
              <Award className="w-8 h-8" />
            </div>

            <span className="font-mono text-[9px] text-slate-500 block uppercase tracking-widest leading-none mb-1">
              PERFORMANCE COMPLETED
            </span>
            <h2 className="text-xl font-bold text-white font-mono uppercase tracking-wide leading-tight mt-1">
              {activeSong.title}
            </h2>
            <p className="text-xs text-cyan-400 font-mono tracking-wider mb-6">
              by {activeSong.artist}
            </p>

            {/* Giant Evaluation Ring Rank */}
            <div className="w-40 h-40 rounded-full border-2 border-dashed border-cyan-500/20 flex flex-col items-center justify-center mx-auto mb-6 relative">
              <div className="absolute inset-2 rounded-full border border-cyan-500/10 bg-slate-950/80 flex flex-col items-center justify-center">
                <span className="text-[10px] font-mono text-slate-500 block uppercase tracking-widest leading-none">
                  FINAL RANK
                </span>
                <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-[#00f3ff] font-mono block mt-1 select-none leading-none">
                  {scoreState.rank}
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400 mt-2 block tracking-wide">
                  {scoreState.totalScore}% ACCURACY
                </span>
              </div>
            </div>

            {/* Performance line metrics */}
            <div className="space-y-2.5 max-h-[160px] overflow-y-auto p-3 bg-slate-950/60 rounded-xl border border-slate-900 text-left font-mono text-[11px] mb-6">
              <span className="text-slate-500 uppercase block font-bold text-[9px] border-b border-slate-900 pb-1.5 mb-2 tracking-wider">
                SENTENCE ACCURACIES BREAKDOWN
              </span>
              {activeSong.krcLines.map((line, idx) => {
                const score = scoreState.lineScores[idx] ?? 0;
                return (
                  <div
                    key={idx}
                    className="flex justify-between items-center text-slate-300"
                  >
                    <span className="truncate max-w-[210px] text-slate-400 text-[10.5px]">
                      Line {idx + 1}: {line.text}
                    </span>
                    <span
                      className={`font-bold ${score >= 80 ? "text-emerald-400" : score >= 45 ? "text-amber-400" : "text-rose-400"}`}
                    >
                      {score}%
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setCurrentTime(0);
                  setUserPitchHistory([]);
                  setIsPlaying(true);
                  setShowScoreModal(false);
                  setScoreState((prev) => ({
                    ...prev,
                    lineScores: {},
                    totalScore: 0,
                    rank: "--",
                  }));
                }}
                className="grow py-2.5 bg-gradient-to-r from-cyan-400 to-[#00f3ff] hover:from-cyan-300 hover:to-cyan-400 text-slate-950 font-mono text-[11px] font-black tracking-widest rounded-lg transition-all"
                id="modal_retry_btn"
              >
                SING AGAIN
              </button>
              <button
                onClick={() => setShowScoreModal(false)}
                className="grow py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 font-mono text-[11px] font-bold tracking-wider rounded-lg transition-all"
                id="modal_dismiss_btn"
              >
                RETURN TO LOBBY
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAILED TECHNICAL SCHEMATICS DRAWER DIALOG PANEL */}
      {showHelp && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
          id="technical_manual_overlay"
        >
          <div className="w-full max-w-xl bg-[#070c0e] border border-cyan-500/25 rounded-xl overflow-hidden relative shadow-[0_0_35px_rgba(6,182,212,0.15)] p-6">
            <CornerFrame />
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
              <span className="font-mono text-xs font-bold text-slate-300 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" /> SYSTEM
                ARCHITECTURE MAN PAGE
              </span>
              <button
                onClick={() => setShowHelp(false)}
                className="text-slate-400 hover:text-white"
                id="close_schematics_cta"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono leading-relaxed text-slate-400 max-h-[350px] overflow-y-auto p-2">
              <div>
                <span className="text-[#00f3ff] font-bold block mb-1">
                  1. REAL-TIME PITCH ALIGNMENT (THE VOCAL TRACKER)
                </span>
                <p className="pl-3 border-l border-slate-800">
                  The scrolling timeline maps standard melody/pitch data
                  retrieved utilizing{" "}
                  <code className="text-amber-400 bg-slate-950 px-1 rounded font-bold">
                    getStandardPitch
                  </code>
                  . When vocal streams are captured via the microphone or
                  simulated via our autopilot algorithm, the pitch is resolved
                  via{" "}
                  <code className="text-cyan-400 bg-slate-950 px-1 rounded font-bold">
                    getCurrentPitch
                  </code>
                  , applying autocorrelation. Users see deviations displayed as
                  deviations below or above target blocks.
                </p>
              </div>

              <div>
                <span className="text-[#00f3ff] font-bold block mb-1">
                  2. LYRICS ALIGNER & EVALUATIONS
                </span>
                <p className="pl-3 border-l border-slate-800">
                  Lyrical information is requested using{" "}
                  <code className="text-amber-400 bg-slate-950 px-1 rounded font-bold">
                    getKrcLyricByToken
                  </code>
                  . At the end of every sentence,{" "}
                  <code className="text-cyan-400 bg-slate-950 px-1 rounded font-bold">
                    getPreviousScore
                  </code>{" "}
                  is triggered to resolve vocal coverage over target ranges,
                  instantly updating past structures in green. Final aggregates
                  and Rank badges are computed dynamically via{" "}
                  <code className="text-[#00f3ff] bg-slate-950 px-1 rounded font-bold">
                    getTotalScore
                  </code>
                  .
                </p>
              </div>

              <div>
                <span className="text-[#00f3ff] font-bold block mb-1">
                  3. BUFFER DOWNLOAD DRIVER
                </span>
                <p className="pl-3 border-l border-slate-800">
                  When ordering a track from the library panel, a mock caching
                  process triggers via{" "}
                  <code className="text-cyan-400 bg-slate-950 px-1 rounded">
                    requestResource
                  </code>
                  , emulating background asset streaming before enabling vocal
                  controls.
                </p>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowHelp(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono text-xs font-bold tracking-wider rounded border border-slate-800 transition-colors"
                id="close_schematics_manual"
              >
                CLOSE MANUAL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
