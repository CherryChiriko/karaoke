import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Mic,
  MicOff,
  Play,
  Pause,
  RotateCcw,
  Music,
  Download,
  Volume2,
  Award,
  Terminal,
  HelpCircle,
  Activity,
  X,
  Radio,
  ExternalLink,
  Disc,
  ListRestart
} from "lucide-react";
import {
  SONG_LIBRARY,
  getStandardPitch,
  getCurrentPitch,
  getPreviousScore,
  getTotalScore,
  requestResource,
  getKrcLyricByToken,
  getNoteNotation,
  midiToHz
} from "./lib/sdk";
import { Song, KrcLine, PitchBlock, PitchPoint, QueueState, QueueSong, ScoreState } from "./types";

// Corner Bracket Decoration helper to match the high-end industrial visual in screenshot
const CornerFrame = () => (
  <>
    <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-cyan-500/60 pointer-events-none" />
    <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-cyan-500/60 pointer-events-none" />
    <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-cyan-500/60 pointer-events-none" />
    <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-cyan-500/60 pointer-events-none" />
  </>
);

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
  const [queueStates, setQueueStates] = useState<Record<string, { state: QueueState; progress: number }>>({
    neon_drift: { state: "IDLE", progress: 0 },
    midnight_circuit: { state: "IDLE", progress: 0 },
    chromatic_bloom: { state: "IDLE", progress: 0 }
  });

  // Physical Microphoning & Simulated Vocalist Toggle
  const [isMicEnabled, setIsMicEnabled] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSimulatedSinger, setIsSimulatedSinger] = useState<boolean>(true); // Simulated is active by default for pleasant evaluation out-of-the-box

  // Pitch tracking results
  const [detectedPitch, setDetectedPitch] = useState<{ midi: number; hz: number; isMatched: boolean } | null>(null);
  const [targetMidi, setTargetMidi] = useState<number | null>(null);
  const [userPitchHistory, setUserPitchHistory] = useState<PitchPoint[]>([]);

  // Mic DB amplitude meters
  const [micVolume, setMicVolume] = useState<number>(0); // values from 0 to 100 for level indicator
  const [micStatusLog, setMicStatusLog] = useState<string>("VIRTUAL FEEDBACK READY");

  // Scoring details
  const [scoreState, setScoreState] = useState<ScoreState>({
    currentLineIndex: -1,
    lineScores: {},
    totalScore: 0,
    rank: "--"
  });
  const [showScoreModal, setShowScoreModal] = useState<boolean>(false);

  // Completed Session Log to preserve scores
  const [sessionLogs, setSessionLogs] = useState<{ songTitle: string; artist: string; date: string; score: number; rank: string }[]>([
    { songTitle: "Neon Drift", artist: "Synthia Vane", date: "June 12, 2026", score: 88, rank: "A" },
    { songTitle: "Midnight Circuit", artist: "Pixel Pulse", date: "June 13, 2026", score: 64, rank: "B" }
  ]);

  // Audio Context Ref structure
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);

  // References for Canvas Size Adaptation
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 800, height: 280 });

  // Synced refs to prevent closures from trapping stale states in requestAnimationFrame hook loops
  const stateRef = useRef({
    isPlaying: false,
    currentTime: 0,
    activeSong: null as Song | null,
    isSimulatedSinger: true,
    isMicEnabled: false,
    userPitchHistory: [] as PitchPoint[],
    detectedPitch: null as { midi: number; hz: number; isMatched: boolean } | null,
    scoreState: { currentLineIndex: -1, lineScores: {} as Record<number, number> }
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
      lineScores: scoreState.lineScores
    };
  }, [isPlaying, currentTime, activeSong, isSimulatedSinger, isMicEnabled, userPitchHistory, detectedPitch, scoreState]);

  // Adapt to Canvas Div modifications using standard ResizeObserver
  useEffect(() => {
    if (!canvasContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setCanvasDimensions({
          width: Math.max(width, 400),
          height: Math.max(height, 200)
        });
      }
    });
    observer.observe(canvasContainerRef.current);
    return () => observer.disconnect();
  }, []);

  // Physically activate raw microphone input using browser AudioContext
  const startMicNode = async () => {
    try {
      setMicStatusLog("INITIALIZING MICROPHONE...");
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      // Resume context if browser suspended it (standard requirement)
      if (audioCtxRef.current.state === "suspended") {
        await audioCtxRef.current.resume();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      micStreamRef.current = stream;
      const source = audioCtxRef.current.createMediaStreamSource(stream);
      const analyser = audioCtxRef.current.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsMicEnabled(true);
      setMicStatusLog("MICROPHONE LEVEL RAW CHANNEL ACTIVE");

      // Continuously measure input volume
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const val = Math.min(100, Math.round((sum / bufferLength) * 1.8));
        setMicVolume(val);
        if (stateRef.current.isMicEnabled) {
          requestAnimationFrame(updateVolume);
        }
      };
      updateVolume();
    } catch (err: any) {
      console.warn("Microphone permissions rejected or unavailable:", err);
      setMicStatusLog(`MIC ERROR: UNABLE TO BIND RAW CAPTURE (${err.message || 'Permission denied'})`);
      setIsMicEnabled(false);
    }
  };

  const stopMicNode = () => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    analyserRef.current = null;
    setIsMicEnabled(false);
    setMicVolume(0);
    setMicStatusLog("MICROPHONE CHANNEL DISCONNECTED");
  };

  // Ordering handler calling requestResource
  const handleOrderSong = async (songId: string) => {
    if (queueStates[songId]?.state !== "IDLE") return;

    setQueueStates((prev) => ({
      ...prev,
      [songId]: { state: "DOWNLOADING", progress: 0 }
    }));

    const result = await requestResource(songId, (p) => {
      setQueueStates((prev) => ({
        ...prev,
        [songId]: { state: "DOWNLOADING", progress: p }
      }));
    });

    if (result) {
      setQueueStates((prev) => ({
        ...prev,
        [songId]: { state: "READY", progress: 100 }
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
      rank: "--"
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
      if (stateRef.current.activeSong && newTime >= stateRef.current.activeSong.duration * 1000) {
        setIsPlaying(false);
        setCurrentTime(stateRef.current.activeSong.duration * 1000);
        handleSongFinished();
        return;
      }

      setCurrentTime(newTime);

      // Perform real-time pitch matching & target checks
      if (stateRef.current.activeSong) {
        const standardMidi = getStandardPitch(stateRef.current.activeSong, newTime);
        setTargetMidi(standardMidi);

        let pitchResult = null;
        if (stateRef.current.isMicEnabled && analyserRef.current && audioCtxRef.current) {
          // Hardware vocal detection (Autocorrelation)
          pitchResult = getCurrentPitch(analyserRef.current, audioCtxRef.current, standardMidi, false);
        } else if (stateRef.current.isSimulatedSinger) {
          // Autopilot simulation coordinates
          pitchResult = getCurrentPitch(null, null, standardMidi, true, newTime);
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
                isMatched: pitchResult.isMatched
              }
            ];
          });
        } else {
          setDetectedPitch(null);
        }

        // On-the-fly lyrics sentence-by-sentence evaluator:
        // Detect if playhead has advanced past a KrcLine line boundary!
        const lines = stateRef.current.activeSong.krcLines;
        const currentActiveIdx = lines.findIndex(
          (line) => newTime >= line.startTime && newTime <= line.startTime + line.duration
        );

        const currentLineIdx = stateRef.current.scoreState.currentLineIndex;

        // Verify if a previous line has been concluded
        if (currentLineIdx !== -1 && (currentActiveIdx !== currentLineIdx)) {
          const oldLine = lines[currentLineIdx];
          // Check if playhead has passed beyond the line endpoint
          if (newTime > oldLine.startTime + oldLine.duration && stateRef.current.scoreState.lineScores[currentLineIdx] === undefined) {
            // Compute the getPreviousScore performance and cache it
            const lineAccuracy = getPreviousScore(
              stateRef.current.activeSong,
              currentLineIdx,
              stateRef.current.userPitchHistory
            );

            setScoreState((prev) => {
              const updatedScores = {
                ...prev.lineScores,
                [currentLineIdx]: lineAccuracy
              };

              // Tally running score
              const activeCount = Object.keys(updatedScores).length;
              let average = 0;
              if (activeCount > 0) {
                const totalSum = Object.values(updatedScores).reduce((a, b) => a + b, 0);
                average = Math.round(totalSum / activeCount);
              }

              return {
                ...prev,
                lineScores: updatedScores,
                totalScore: average
              };
            });
          }
        }

        if (currentActiveIdx !== -1 && currentActiveIdx !== currentLineIdx) {
          setScoreState((prev) => ({
            ...prev,
            currentLineIndex: currentActiveIdx
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
      rank: evaluation.rank
    }));

    // Record logs to save the performance
    setSessionLogs((prev) => [
      {
        songTitle: activeSong.title,
        artist: activeSong.artist,
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        score: evaluation.pointTotal,
        rank: evaluation.rank
      },
      ...prev
    ]);

    setShowScoreModal(true);
  };

  // Rendering the dynamic pitch grids on the 2D Canvas in real-time
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
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
      ctx.strokeStyle = isC ? "rgba(0, 243, 255, 0.12)" : "rgba(0, 243, 255, 0.03)";
      ctx.linewidth = isC ? 1.5 : 1;
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
      ctx.roundRect ? ctx.roundRect(x, y - heightVal / 2, blockWidth, heightVal, 3) : ctx.rect(x, y - heightVal / 2, blockWidth, heightVal);
      ctx.fill();
      ctx.stroke();

      // Glowing overlay if target note overlaps playhead
      if (currentTime >= block.startTime && currentTime <= block.startTime + block.duration) {
        ctx.fillStyle = "rgba(0, 243, 255, 0.3)";
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(x, y - heightVal / 2, blockWidth, heightVal, 3) : ctx.rect(x, y - heightVal / 2, blockWidth, heightVal);
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

  }, [currentTime, activeSong, userPitchHistory, detectedPitch, targetMidi, canvasDimensions]);

  // Dynamic Lyric Highlight Parsing Helper
  const currentSentenceBlock = useMemo(() => {
    if (!activeSong) return null;

    // Detect line index corresponding to current timestamp
    const lines = activeSong.krcLines;
    const activeIdx = lines.findIndex(
      (line) => currentTime >= line.startTime && currentTime <= line.startTime + line.duration
    );

    // If no exact match, look for the closest upcoming line
    if (activeIdx === -1) {
      const nextLineIdx = lines.findIndex((line) => line.startTime > currentTime);
      return {
        active: false,
        previousLine: lines[nextLineIdx - 1] || null,
        currentLine: lines[nextLineIdx] || null,
        nextLine: lines[nextLineIdx + 1] || null,
        sentenceIndex: nextLineIdx
      };
    }

    return {
      active: true,
      previousLine: lines[activeIdx - 1] || null,
      currentLine: lines[activeIdx] || null,
      nextLine: lines[activeIdx + 1] || null,
      sentenceIndex: activeIdx
    };
  }, [activeSong, currentTime]);

  return (
    <div className="min-h-screen bg-[#030708] text-gray-100 flex flex-col font-sans select-none overflow-x-hidden antialiased selection:bg-cyan-500/30 selection:text-white" id="main_karaoke_room_container">
      
      {/* HEADER SECTION */}
      <header className="border-b border-cyan-500/10 bg-[#060b0d] px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0" id="room_header">
        {/* Brand Left */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-950/40 border border-cyan-500/40 flex items-center justify-center relative shadow-[0_0_15px_rgba(6,182,212,0.15)] glow-animation">
            <Radio className="w-5 h-5 text-[#00f3ff] animate-pulse" />
            <div className="absolute inset-0 bg-[#00f3ff]/5 rounded-lg animate-ping pointer-events-none" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black tracking-widest text-slate-100 font-mono" id="app_title">
                KARAOKE
              </h1>
              <span className="text-[9px] bg-cyan-500/10 hover:bg-cyan-500/20 text-[#00f3ff] border border-cyan-500/30 font-mono px-1.5 py-0.5 rounded cursor-pointer transition-all uppercase" onClick={() => setShowHelp(true)}>
                INFO
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-mono tracking-wider flex items-center gap-1 uppercase">
              <span>VIRTUAL PITCH ROOM</span>
              <span className="text-cyan-700 font-bold">•</span>
              <span>SINGLE PLAYER PERFORMANCE</span>
            </p>
          </div>
        </div>

        {/* Global Navigation Pills */}
        <div className="flex items-center gap-5">
          <div className="flex bg-[#0a1012] p-1 border border-slate-800 rounded-lg shrink-0">
            <button
              onClick={() => setActiveTab("SING")}
              className={`px-4 py-1.5 rounded-md font-mono text-xs font-semibold tracking-wide transition-all ${
                activeTab === "SING"
                  ? "bg-cyan-950/60 text-[#00f3ff] border border-cyan-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              id="tab_sing_button"
            >
              SINGING PORT
            </button>
            <button
              onClick={() => setActiveTab("HISTORY")}
              className={`px-4 py-1.5 rounded-md font-mono text-xs font-semibold tracking-wide transition-all ${
                activeTab === "HISTORY"
                  ? "bg-cyan-950/60 text-[#00f3ff] border border-cyan-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              id="tab_history_button"
            >
              SESSIONS ({sessionLogs.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#091114] border border-cyan-600/20 text-[#00f3ff] font-mono text-[11px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              GUEST MODE
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#1c0d0f] border border-red-500/20 text-rose-400 font-mono text-[11px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
              ROOM 0XE1
            </div>
          </div>
        </div>
      </header>

      {/* METRIC TICKER TICK-STREAM BAR */}
      <div className="bg-[#04080a] border-b border-cyan-500/10 px-6 py-2 flex items-center gap-6 overflow-x-auto whitespace-nowrap scrollbar-none font-mono text-[10px] text-slate-400 uppercase shrink-0" id="ticker_stream_panel">
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
      </div>

      {activeTab === "SING" ? (
        <div className="grow p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-hidden">
          
          {/* LEFT PANEL - ALBUM ART & PLAYBACK PERFORMANCE COVERS */}
          <section className="lg:col-span-1 bg-[#060b0d] border border-cyan-500/10 rounded-xl flex flex-col overflow-hidden relative shadow-[0_4px_24px_rgba(3,7,8,0.4)]" id="left_metadata_panel">
            <CornerFrame />
            
            <div className="p-4 border-b border-cyan-500/10 bg-[#090f11] flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-slate-300 tracking-wider">TRACK METADATA</span>
              <span className="font-mono text-[10px] text-cyan-400 font-semibold uppercase">ACCOMPANIMENT PORT</span>
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
                    Select a song from the library queue on the right panel to begin →
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
                          <span className="text-[10px] text-slate-400 font-mono uppercase block">DURATION</span>
                          <span className="text-xs font-mono font-bold text-white block">
                            {Math.floor(activeSong.duration / 60)}:
                            {String(activeSong.duration % 60).padStart(2, "0")}s
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="border-l-2 border-[#00f3ff] pl-3">
                      <h3 className="font-bold text-lg text-white font-mono leading-tight">{activeSong.title}</h3>
                      <p className="text-xs text-cyan-400 font-mono tracking-wider">{activeSong.artist}</p>
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
                        {(currentTime / 1000).toFixed(1)}s / {activeSong.duration}.0s
                      </span>
                    </div>

                    {/* Simple Progress Bar */}
                    <div className="w-full bg-[#030607] h-1.5 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="bg-[#00f3ff] h-full shadow-[0_0_8px_#00f3ff] transition-all duration-75"
                        style={{ width: `${Math.min(100, (currentTime / (activeSong.duration * 1000)) * 100)}%` }}
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
                            rank: "--"
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
                            rank: "--"
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
            <section className="bg-[#060b0d] border border-cyan-500/15 rounded-xl overflow-hidden flex flex-col relative shadow-[0_4px_24px_rgba(3,7,8,0.4)]" id="middle_pitch_timeline">
              <CornerFrame />
              
              <div className="p-4 border-b border-cyan-500/10 bg-[#090f11] flex items-center justify-between text-slate-300">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span className="font-mono text-xs font-bold leading-none">PITCH STAGE • ±1.0 SEMITONE OFFSET</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-800 text-[9px] font-mono font-bold text-cyan-400 uppercase">
                    6s WINDOW
                  </span>
                </div>
              </div>

              {/* Main Scrolling staff display */}
              <div
                ref={canvasContainerRef}
                className="w-full h-[280px] bg-[#090e11] relative overflow-hidden flex items-center justify-center border-b border-cyan-500/10"
              >
                {!activeSong ? (
                  <div className="text-center font-mono p-6">
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 block">PITCH GRAPH CHIP INACTIVE</span>
                    <span className="text-[10px] text-cyan-500 border border-cyan-950 bg-cyan-950/10 rounded px-2.5 py-1 inline-block mt-3 uppercase tracking-wide">
                      Awaiting Song Selection
                    </span>
                  </div>
                ) : (
                  <canvas
                    ref={canvasRef}
                    width={canvasDimensions.width}
                    height={canvasDimensions.height}
                    className="absolute inset-0 block w-full h-full cursor-crosshair"
                    id="real_time_pitch_canvas"
                  />
                )}
              </div>

              {/* Dynamic telemetry stats row */}
              <div className="bg-[#030607] p-3 border-t border-slate-900 font-mono text-[9px] flex items-center justify-between text-slate-500">
                <span>GRAPH INTERPOLATION: AUDIO-BOUND 20HZ</span>
                <span className="text-rose-500 font-bold uppercase flex items-center gap-1">
                  <span>● VOICE LINE GRAPH</span>
                  <span className="text-cyan-500 pl-1">● TARGET TRACKER BOUNDS</span>
                </span>
              </div>
            </section>

            {/* TELEPROMPTER LYRIC DESCRIPTIONS SECTION */}
            <section className="bg-[#060b0d] border border-cyan-500/15 rounded-xl overflow-hidden relative flex flex-col justify-between grow shadow-[0_4px_24px_rgba(3,7,8,0.4)]" id="middle_lyrics_panel">
              <CornerFrame />
              
              <div className="p-4 border-b border-cyan-500/10 bg-[#090f11] flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-slate-300 tracking-wider">KRC SYNCED LYRIC TELEPROMPTER</span>
                <span className="font-mono text-[9px] text-[#00f3ff] font-bold uppercase tracking-widest leading-none">
                  L-LYRIC ALIGNER
                </span>
              </div>

              <div className="p-8 flex flex-col justify-center items-center grow min-h-[170px] bg-gradient-to-b from-[#060b0d] to-[#04080a] text-center">
                {!activeSong ? (
                  <span className="font-mono text-xs text-slate-600 block uppercase italic tracking-widest my-auto" id="no_lyrics_message">
                    [ no lyrics loaded ]
                  </span>
                ) : (
                  <div className="w-full flex flex-col gap-5 justify-center py-2 h-full">
                    
                    {/* Previous sentence block (smaller, low opacity) */}
                    <div className="text-[11px] md:text-xs text-slate-600 font-mono italic select-none h-4 overflow-hidden uppercase tracking-wide">
                      {currentSentenceBlock?.previousLine ? (
                        <span>{currentSentenceBlock.previousLine.text}</span>
                      ) : (
                        <span className="opacity-0">-</span>
                      )}
                    </div>

                    {/* Active dynamic lyrics block */}
                    <div className="py-2.5 flex flex-wrap gap-x-2.5 gap-y-1.5 items-center justify-center" id="active_lyric_line_container">
                      {currentSentenceBlock?.currentLine ? (
                        currentSentenceBlock.currentLine.words.map((word, wordIdx) => {
                          const wStart = word.startTime;
                          const wEnd = word.startTime + word.duration;
                          
                          // Determine status of this word relative to playhead time
                          const isBefore = currentTime < wStart;
                          const isActive = currentTime >= wStart && currentTime < wEnd;
                          const isAfter = currentTime >= wEnd;

                          // For word that is already completed (isAfter), verify if singer was successful
                          // Calculate if pitch aligned at any fraction inside its timestamp window
                          let isSyllableMatched = false;
                          if (isAfter || isActive) {
                            const wordHistory = userPitchHistory.filter(
                              (h) => h.time >= wStart && h.time <= wEnd
                            );
                            if (wordHistory.length > 0) {
                              const matches = wordHistory.filter((m) => m.isMatched);
                              isSyllableMatched = (matches.length / wordHistory.length) >= 0.35;
                            } else {
                              // If using simulation mode, simulate matching nicely
                              if (isSimulatedSinger) {
                                isSyllableMatched = true;
                              }
                            }
                          }

                          let textClass = "text-slate-500 font-mono text-base md:text-lg transition-all duration-150 uppercase tracking-wide";
                          if (isActive) {
                            textClass = "text-[#00f3ff] font-extrabold text-[#00f3ff] scale-105 shadow-[0_0_12px_rgba(0,243,255,0.2)] font-mono text-base md:text-xl underline decoration-[#00f3ff] decoration-2 underline-offset-4 tracking-wide";
                          } else if (isAfter) {
                            textClass = isSyllableMatched
                              ? "text-emerald-400 font-bold font-mono text-base md:text-lg shadow-emerald-400/10 drop-shadow-[0_0_3px_#10b981] tracking-wide"
                              : "text-slate-300 font-mono text-base md:text-lg tracking-wide";
                          }

                          return (
                            <span key={wordIdx} className={`${textClass} transition-all duration-100 ease-out`} style={{ textShadow: isActive ? "0 0 10px rgba(0,243,255,0.4)" : undefined }}>
                              {word.text.trim()}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-slate-600 font-mono text-xs uppercase italic tracking-widest my-3">
                          ( INSTRUMENTAL PHASING ... )
                        </span>
                      )}
                    </div>

                    {/* Next sentence block (smaller, low opacity) */}
                    <div className="text-[11px] md:text-xs text-slate-600 font-mono italic select-none h-4 overflow-hidden uppercase tracking-wide">
                      {currentSentenceBlock?.nextLine ? (
                        <span>{currentSentenceBlock.nextLine.text}</span>
                      ) : (
                        <span className="opacity-0">-</span>
                      )}
                    </div>

                    {/* Show Previous Sentence accuracy results */}
                    {currentSentenceBlock !== null && scoreState.currentLineIndex > 0 && (
                      <div className="pt-4 mt-2 border-t border-slate-900/40 w-full flex items-center justify-center gap-4 text-[10px]">
                        <span className="font-mono text-slate-500 uppercase">
                          PREV LINE SCORE:
                        </span>
                        <span className={`font-mono font-black border px-2 py-0.5 rounded ${
                          (scoreState.lineScores[scoreState.currentLineIndex - 1] ?? 0) >= 80
                            ? "text-emerald-400 bg-emerald-950/20 border-emerald-500/30 font-extrabold"
                            : (scoreState.lineScores[scoreState.currentLineIndex - 1] ?? 0) >= 45
                            ? "text-amber-400 bg-amber-950/20 border-amber-500/30"
                            : "text-rose-400 bg-rose-950/20 border-rose-500/30"
                        }`}>
                          {scoreState.lineScores[scoreState.currentLineIndex - 1] ?? 0}% ACCURACY
                        </span>
                      </div>
                    )}

                  </div>
                )}
              </div>

              {/* Realtime scoring bar inside footer */}
              <div className="bg-[#030607] border-t border-cyan-500/10 px-4 py-3 font-mono text-[10px] flex items-center justify-between text-slate-500 shrink-0">
                <span className="flex items-center gap-1">
                  <span>ROOM CUMULATIVE AVERAGE:</span>
                  <span className="text-white font-bold">{scoreState.totalScore}%</span>
                </span>
                <span className="text-emerald-500 font-bold uppercase flex items-center gap-1 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]">
                  <Award className="w-3 h-3 text-emerald-400" /> STAGE ACCURACY
                </span>
              </div>
            </section>

          </div>

          {/* RIGHT PANEL - MIC INPUT AND REALT-TIME PITCH DELTAS & SONG DOWNLOADER */}
          <div className="lg:col-span-1 flex flex-col gap-6 overflow-hidden">
            
            {/* MIC INPUT UNIT */}
            <section className="bg-[#060b0d] border border-cyan-500/15 rounded-xl overflow-hidden relative flex flex-col shadow-[0_4px_24px_rgba(3,7,8,0.4)]" id="right_mic_input_section">
              <CornerFrame />
              
              <div className="p-4 border-b border-cyan-500/10 bg-[#090f11] flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-slate-300 tracking-wider">MIC INPUT</span>
                <div className="flex items-center gap-1 text-[9px] font-mono font-bold uppercase">
                  {isMicEnabled ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> ONLINE
                    </span>
                  ) : (
                    <span className="text-rose-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" /> MUTED
                    </span>
                  )}
                </div>
              </div>

              <div className="p-6 flex flex-col gap-4">
                {/* Enable Microphone Button with glowing hover states */}
                {!isMicEnabled ? (
                  <button
                    onClick={startMicNode}
                    className="w-full py-3.5 bg-gradient-to-r from-cyan-400 to-[#00f3ff] text-slate-950 rounded-lg hover:from-cyan-300 hover:to-cyan-400 font-mono text-xs font-black tracking-widest flex items-center justify-center gap-2 transition-all duration-300 shadow-[0_0_20px_rgba(6,182,212,0.3)] animate-pulse"
                    id="enable_microphone_cta"
                  >
                    <Mic className="w-4 h-4 text-black stroke-[3px]" /> ENABLE MICROPHONE
                  </button>
                ) : (
                  <button
                    onClick={stopMicNode}
                    className="w-full py-3.5 bg-rose-950/20 hover:bg-rose-900/30 border border-rose-500/40 text-rose-300 rounded-lg font-mono text-xs font-extrabold tracking-widest flex items-center justify-center gap-2 transition-all duration-200"
                    id="disable_microphone_cta"
                  >
                    <MicOff className="w-4 h-4 text-rose-400" /> DISCONNECT MICROPHONE
                  </button>
                )}

                {/* DB Amplitude Bars */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between font-mono text-[9px] text-slate-500">
                    <span>MICROPHONE INPUT DECIBEL RANGE</span>
                    <span>{isMicEnabled ? `${micVolume} dB` : "MUTED"}</span>
                  </div>
                  
                  {/* Amplitude bars matching standard audio board */}
                  <div className="flex gap-1 h-3 bg-slate-950 rounded overflow-hidden p-0.5 border border-slate-900">
                    {Array.from({ length: 24 }).map((_, i) => {
                      const isActive = isMicEnabled && micVolume > (i * (100 / 24));
                      // color gets progressively redder at high volume
                      let bgClass = "bg-[#1f2022]";
                      if (isActive) {
                        if (i > 18) bgClass = "bg-rose-500 shadow-[0_0_5px_#f43f5e]";
                        else if (i > 12) bgClass = "bg-amber-400 shadow-[0_0_5px_#fbbf24]";
                        else bgClass = "bg-cyan-500 shadow-[0_0_5px_#06b6d4]";
                      }
                      return <div key={i} className={`grow h-full rounded-sm transition-all duration-75 ${bgClass}`} />;
                    })}
                  </div>
                </div>

                {/* Pitch Delta Readouts */}
                <div className="border-t border-slate-800/60 pt-4 mt-2">
                  <span className="font-mono text-[10px] text-slate-500 uppercase block mb-3 font-semibold tracking-wider">
                    PITCH DELTA FEEDBACK
                  </span>
                  
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-[#030607]/60 p-2.5 rounded border border-slate-900 flex flex-col justify-center">
                      <span className="text-[9px] font-mono text-slate-500 block uppercase">YOU (Vocal Hz)</span>
                      <span className={`text-[13px] font-mono font-bold block mt-1 ${detectedPitch ? "text-[#00f3ff]" : "text-slate-600"}`}>
                        {detectedPitch ? `${detectedPitch.hz.toFixed(1)}Hz` : "--.-"}
                      </span>
                      <span className={`text-[10px] font-mono uppercase font-black tracking-widest mt-0.5 ${detectedPitch ? "text-cyan-400" : "text-slate-600"}`}>
                        {detectedPitch ? `(${getNoteNotation(detectedPitch.midi)})` : "--"}
                      </span>
                    </div>

                    <div className="bg-[#030607]/60 p-2.5 rounded border border-slate-900 flex flex-col justify-center">
                      <span className="text-[9px] font-mono text-slate-500 block uppercase">TARGET (Melody Hz)</span>
                      <span className={`text-[13px] font-mono font-bold block mt-1 ${targetMidi ? "text-amber-400" : "text-slate-600"}`}>
                        {targetMidi ? `${midiToHz(targetMidi).toFixed(1)}Hz` : "--.-"}
                      </span>
                      <span className={`text-[10px] font-mono uppercase font-black tracking-widest mt-0.5 ${targetMidi ? "text-amber-500" : "text-slate-600"}`}>
                        {targetMidi ? `(${getNoteNotation(targetMidi)})` : "--"}
                      </span>
                    </div>
                  </div>

                  {/* Frequency distance meter bar */}
                  {detectedPitch && targetMidi !== null && (
                    <div className="mt-4 space-y-1 bg-[#04080a] p-2.5 rounded border border-cyan-500/10">
                      <div className="flex justify-between font-mono text-[9px]">
                        <span className="text-slate-500">SEMITONES DEVIATION</span>
                        <span className={Math.abs(detectedPitch.midi - targetMidi) <= 1.5 ? "text-emerald-400" : "text-rose-400"}>
                          {(detectedPitch.midi - targetMidi).toFixed(2)} ST
                        </span>
                      </div>
                      <div className="relative h-2 bg-[#04080a] border border-slate-800 rounded overflow-hidden flex items-center justify-center">
                        <div className="absolute h-full w-0.5 bg-slate-700 left-1/2 -translate-x-1/2" />
                        <div className="absolute h-full w-8 bg-emerald-500/20 left-1/2 -translate-x-1/2" /> {/* Match Bounds */}
                        <div
                          className={`absolute h-2.5 w-2.5 rounded-full border border-white ${
                            Math.abs(detectedPitch.midi - targetMidi) <= 1.5 ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                          style={{
                            left: `calc(50% + ${Math.min(50, Math.max(-50, (detectedPitch.midi - targetMidi) * 16))}% - 5px)`
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Logger footer */}
              <div className="bg-[#030607] border-t border-cyan-500/10 p-3 font-mono text-[10px] text-slate-500 flex items-center justify-between shrink-0">
                <span>SYS LOGS: OK</span>
                <span className="text-cyan-600 truncate max-w-[150px]">{micStatusLog}</span>
              </div>
            </section>

            {/* SONG QUEUE / DOWNLOAD ARCHITECTURE MODULE */}
            <section className="bg-[#060b0d] border border-cyan-500/15 rounded-xl overflow-hidden relative flex flex-col justify-between grow shadow-[0_4px_24px_rgba(3,7,8,0.4)]" id="right_song_library_section">
              <CornerFrame />
              
              <div className="p-4 border-b border-cyan-500/10 bg-[#090f11] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-mono text-xs font-bold text-slate-300 tracking-wider">SONG BOARD QUEUE</span>
                </div>
                <span className="font-mono text-[10px] text-slate-500">3 TRACKS</span>
              </div>

              <div className="p-4 flex flex-col gap-3 grow overflow-y-auto max-h-[300px]">
                {SONG_LIBRARY.map((song) => {
                  const q = queueStates[song.id] || { state: "IDLE", progress: 0 };
                  const isCurrent = activeSong?.id === song.id;

                  return (
                    <div
                      key={song.id}
                      className={`p-3 rounded-lg border transition-all flex flex-col gap-2 ${
                        isCurrent
                          ? "bg-cyan-950/20 border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.1)]"
                          : "bg-[#030607]/80 hover:bg-[#070d10] border-slate-900 hover:border-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={song.albumArt}
                          alt={song.title}
                          className="w-11 h-11 object-cover rounded-md border border-slate-800 shrink-0"
                        />
                        <div className="grow min-w-0">
                          <span className="font-bold text-xs text-white block truncate uppercase font-mono">
                            {song.title}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate font-mono">
                            {song.artist}
                          </span>
                        </div>

                        {/* Order button states based on caching status */}
                        <div className="shrink-0">
                          {q.state === "IDLE" ? (
                            <button
                              onClick={() => handleOrderSong(song.id)}
                              className="px-3 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/30 text-[#00f3ff] rounded font-mono text-[10px] font-bold flex items-center gap-1 leading-none shadow-sm transition-all"
                            >
                              <Download className="w-3 h-3" /> ORDER
                            </button>
                          ) : q.state === "DOWNLOADING" ? (
                            <div className="px-2.5 py-1 bg-slate-900 border border-slate-800 text-slate-400 rounded font-mono text-[10px] flex items-center gap-1.5 animate-pulse">
                              <span>缓冲 {q.progress}%</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleSelectSong(song)}
                              disabled={isCurrent}
                              className={`px-3 py-1 rounded font-mono text-[10px] font-bold tracking-wider transition-all border ${
                                isCurrent
                                  ? "bg-cyan-500/10 border-cyan-500/20 text-[#00f3ff] cursor-default"
                                  : "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300"
                              }`}
                            >
                              {isCurrent ? "ACTIVE" : "SELECT"}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Display Downloading Progress track */}
                      {q.state === "DOWNLOADING" && (
                        <div className="w-full bg-[#030607] h-1 rounded-full overflow-hidden border border-slate-900 mt-1">
                          <div
                            className="bg-[#00f3ff] h-full duration-150 transition-all shadow-[0_0_4px_#00f3ff]"
                            style={{ width: `${q.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Developer watermark tags */}
              <div className="bg-[#030607] border-t border-cyan-500/10 p-3.5 font-mono text-[8px] text-slate-600 flex flex-col gap-1.5 shrink-0">
                <div className="flex justify-between items-center">
                  <span>API SYSTEM HANDLERS</span>
                  <span className="text-[#00f3ff] hover:underline cursor-pointer flex items-center gap-0.5" onClick={() => setShowHelp(true)}>
                    VIEW SCHEMATICS <ExternalLink className="w-2.5 h-2.5" />
                  </span>
                </div>
                <p className="text-[7.5px] text-slate-500 italic block border-t border-slate-900/60 pt-1">
                  POWERED BY GETSTANDARDPITCH • GETCURRENTPITCH • GETKRCPLYRICBYTOKEN • GETPREVIOUSSCORE
                </p>
              </div>
            </section>

          </div>

        </div>
      ) : (
        /* HISTORIC PERFORMANCE LOGS VIEW */
        <div className="grow p-6 overflow-y-auto flex flex-col items-center">
          <div className="w-full max-w-4xl bg-[#060b0d] border border-cyan-500/15 rounded-xl overflow-hidden relative shadow-2xl" id="history_sessions_page">
            <CornerFrame />
            
            <div className="p-5 border-b border-cyan-500/10 bg-[#090f11] flex items-center justify-between">
              <span className="font-mono text-sm font-bold text-slate-300 tracking-wider flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-400" /> HISTORIC VOICE EVALUATION LOGS
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
                  <span className="uppercase text-xs font-bold block mb-2 text-[#00f3ff]">No Performance Data Recorded Yet</span>
                  <p className="text-[11px] text-slate-600 max-w-[280px] leading-relaxed">
                    Set active mic/sim trackers and sing through any accompaniment song track to store score evaluation cards!
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse font-mono text-xs">
                    <thead>
                      <tr className="border-b border-slate-800/80 text-cyan-400/80 uppercase">
                        <th className="py-3 px-4 font-bold tracking-wider">ACCOMPANIMENT SONG</th>
                        <th className="py-3 px-4 font-bold tracking-wider">VOCALIST</th>
                        <th className="py-3 px-4 font-bold tracking-wider">ACCURACY</th>
                        <th className="py-3 px-4 font-bold tracking-wider">CUMULATIVE RANK</th>
                        <th className="py-3 px-4 font-bold tracking-wider">PERFORMANCE TIMELINE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/60 text-slate-300">
                      {sessionLogs.map((log, idx) => (
                        <tr key={idx} className="hover:bg-slate-950/50 transition-colors">
                          <td className="py-3 px-4 font-bold text-white">{log.songTitle}</td>
                          <td className="py-3 px-4 text-slate-500 text-[11px]">{log.artist}</td>
                          <td className="py-3 px-4 font-bold text-emerald-400">{log.score}% Accuracy</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-widest ${
                              log.rank === "S"
                                ? "bg-amber-500/10 border border-amber-500/30 text-amber-400"
                                : log.rank === "A"
                                ? "bg-cyan-500/11 border border-cyan-500/30 text-[#00f3ff]"
                                : "bg-slate-800 text-slate-400"
                            }`}>
                              RANK {log.rank}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 text-[11px]">{log.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-[#030607] p-4 text-slate-500 font-mono text-[10px] text-center border-t border-slate-900/80">
              * Historic rankings are cached in standard local program environments.
            </div>
          </div>
        </div>
      )}

      {/* END-OFS-SESSION PERFORMANCE ACHIEVEMENTS MODAL OVERLAY */}
      {showScoreModal && activeSong && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in" id="performance_evaluation_modal">
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
                  <div key={idx} className="flex justify-between items-center text-slate-300">
                    <span className="truncate max-w-[210px] text-slate-400 text-[10.5px]">
                      Line {idx + 1}: {line.text}
                    </span>
                    <span className={`font-bold ${score >= 80 ? "text-emerald-400" : score >= 45 ? "text-amber-400" : "text-rose-400"}`}>
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
                    rank: "--"
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" id="technical_manual_overlay">
          <div className="w-full max-w-xl bg-[#070c0e] border border-cyan-500/25 rounded-xl overflow-hidden relative shadow-[0_0_35px_rgba(6,182,212,0.15)] p-6">
            <CornerFrame />
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
              <span className="font-mono text-xs font-bold text-slate-300 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" /> SYSTEM ARCHITECTURE MAN PAGE
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
                <span className="text-[#00f3ff] font-bold block mb-1">1. REAL-TIME PITCH ALIGNMENT (THE VOCAL TRACKER)</span>
                <p className="pl-3 border-l border-slate-800">
                  The scrolling timeline maps standard melody/pitch data retrieved utilizing <code className="text-amber-400 bg-slate-950 px-1 rounded font-bold">getStandardPitch</code>. 
                  When vocal streams are captured via the microphone or simulated via our autopilot algorithm, 
                  the pitch is resolved via <code className="text-cyan-400 bg-slate-950 px-1 rounded font-bold">getCurrentPitch</code>, applying autocorrelation. 
                  Users see deviations displayed as deviations below or above target blocks.
                </p>
              </div>

              <div>
                <span className="text-[#00f3ff] font-bold block mb-1">2. LYRICS ALIGNER & EVALUATIONS</span>
                <p className="pl-3 border-l border-slate-800">
                  Lyrical information is requested using <code className="text-amber-400 bg-slate-950 px-1 rounded font-bold">getKrcLyricByToken</code>. 
                  At the end of every sentence, <code className="text-cyan-400 bg-slate-950 px-1 rounded font-bold">getPreviousScore</code> is triggered 
                  to resolve vocal coverage over target ranges, instantly updating past structures in green. 
                  Final aggregates and Rank badges are computed dynamically via <code className="text-[#00f3ff] bg-slate-950 px-1 rounded font-bold">getTotalScore</code>.
                </p>
              </div>

              <div>
                <span className="text-[#00f3ff] font-bold block mb-1">3. BUFFER DOWNLOAD DRIVER</span>
                <p className="pl-3 border-l border-slate-800">
                  When ordering a track from the library panel, a mock caching process triggers via <code className="text-cyan-400 bg-slate-950 px-1 rounded">requestResource</code>, 
                  emulating background asset streaming before enabling vocal controls.
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
