import React from "react";
import { Mic, MicOff } from "lucide-react";
import { CyberPanel } from "../../General/ui/CyberPanel";
import { theme } from "../../../../assets/themes";

// Import your centralized types
import { PitchPoint } from "../../../types";

interface MicInputSectionProps {
  isMicEnabled: boolean;
  micVolume: number;
  micStatusLog: string;
  detectedPitch: { midi: number; hz: number; isMatched: boolean } | null;
  targetMidi: number | null;
  startMicNode: () => Promise<void>;
  stopMicNode: () => void;
  getNoteNotation: (midi: number) => string;
  midiToHz: (midi: number) => number;
}

export const MicInputSection: React.FC<MicInputSectionProps> = ({
  isMicEnabled,
  micVolume,
  micStatusLog,
  detectedPitch,
  targetMidi,
  startMicNode,
  stopMicNode,
  getNoteNotation,
  midiToHz,
}) => {
  // Composite Header Configuration
  const headerTitle = <span className={theme.text.title}>MIC INPUT</span>;

  const headerMeta = (
    <div className="flex items-center gap-1 text-[9px] font-mono font-bold uppercase">
      {isMicEnabled ? (
        <span className="text-emerald-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />{" "}
          ONLINE
        </span>
      ) : (
        <span className="text-rose-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" /> MUTED
        </span>
      )}
    </div>
  );

  // Composite Footer Configuration
  const footer = (
    <>
      <span>SYS LOGS: OK</span>
      <span className="text-cyan-600 truncate max-w-37.5 uppercase font-bold tracking-wider">
        {micStatusLog}
      </span>
    </>
  );

  return (
    <CyberPanel
      id="right_mic_input_section"
      headerTitle={headerTitle}
      headerMeta={headerMeta}
      footer={footer}
      contentClassName="p-6 flex flex-col gap-4"
    >
      {/* Dynamic Action CTA Hook Activator */}
      {!isMicEnabled ? (
        <button
          onClick={startMicNode}
          className="w-full py-3.5 bg-linear-to-r from-cyan-400 to-[#00f3ff] text-slate-950 rounded-lg hover:from-cyan-300 hover:to-cyan-400 font-mono text-xs font-black tracking-widest flex items-center justify-center gap-2 transition-all duration-300 shadow-[0_0_20px_rgba(6,182,212,0.3)] animate-pulse"
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

      {/* DB Amplitude Board Graphic */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between font-mono text-[9px] text-slate-500">
          <span>MICROPHONE INPUT DECIBEL RANGE</span>
          <span className="font-bold">
            {isMicEnabled ? `${micVolume} dB` : "MUTED"}
          </span>
        </div>

        {/* Amplitude bars tracking standard audio mixers */}
        <div className="flex gap-1 h-3 bg-slate-950 rounded overflow-hidden p-0.5 border border-slate-900">
          {Array.from({ length: 24 }).map((_, i) => {
            const isActive = isMicEnabled && micVolume > i * (100 / 24);

            let bgClass = "bg-[#1f2022]";
            if (isActive) {
              if (i > 18) bgClass = "bg-rose-500 shadow-[0_0_5px_#f43f5e]";
              else if (i > 12)
                bgClass = "bg-amber-400 shadow-[0_0_5px_#fbbf24]";
              else bgClass = "bg-cyan-500 shadow-[0_0_5px_#06b6d4]";
            }
            return (
              <div
                key={i}
                className={`grow h-full rounded-sm transition-all duration-75 ${bgClass}`}
              />
            );
          })}
        </div>
      </div>

      {/* Pitch Delta Telemetry Section */}
      <div className="border-t border-slate-800/60 pt-4 mt-2">
        <span className="font-mono text-[10px] text-slate-500 uppercase block mb-3 font-semibold tracking-wider">
          PITCH DELTA FEEDBACK
        </span>

        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="bg-[#030607]/60 p-2.5 rounded border border-slate-900 flex flex-col justify-center">
            <span className="text-[9px] font-mono text-slate-500 block uppercase">
              YOU (Vocal Hz)
            </span>
            <span
              className={`text-[13px] font-mono font-bold block mt-1 ${detectedPitch ? "text-[#00f3ff]" : "text-slate-600"}`}
            >
              {detectedPitch ? `${detectedPitch.hz.toFixed(1)}Hz` : "--.-"}
            </span>
            <span
              className={`text-[10px] font-mono uppercase font-black tracking-widest mt-0.5 ${detectedPitch ? "text-cyan-400" : "text-slate-600"}`}
            >
              {detectedPitch
                ? `(${getNoteNotation(detectedPitch.midi)})`
                : "--"}
            </span>
          </div>

          <div className="bg-[#030607]/60 p-2.5 rounded border border-slate-900 flex flex-col justify-center">
            <span className="text-[9px] font-mono text-slate-500 block uppercase">
              TARGET (Melody Hz)
            </span>
            <span
              className={`text-[13px] font-mono font-bold block mt-1 ${targetMidi ? "text-amber-400" : "text-slate-600"}`}
            >
              {targetMidi ? `${midiToHz(targetMidi).toFixed(1)}Hz` : "--.-"}
            </span>
            <span
              className={`text-[10px] font-mono uppercase font-black tracking-widest mt-0.5 ${targetMidi ? "text-amber-500" : "text-slate-600"}`}
            >
              {targetMidi ? `(${getNoteNotation(targetMidi)})` : "--"}
            </span>
          </div>
        </div>

        {/* Semitones cent distance deviation tuner slider */}
        {detectedPitch && targetMidi !== null && (
          <div className="mt-4 space-y-1 bg-[#04080a] p-2.5 rounded border border-cyan-500/10">
            <div className="flex justify-between font-mono text-[9px]">
              <span className="text-slate-500">SEMITONES DEVIATION</span>
              <span
                className={
                  Math.abs(detectedPitch.midi - targetMidi) <= 1.5
                    ? "text-emerald-400"
                    : "text-rose-400"
                }
              >
                {(detectedPitch.midi - targetMidi).toFixed(2)} ST
              </span>
            </div>
            <div className="relative h-2 bg-[#04080a] border border-slate-800 rounded overflow-hidden flex items-center justify-center">
              <div className="absolute h-full w-0.5 bg-slate-700 left-1/2 -translate-x-1/2" />
              <div className="absolute h-full w-8 bg-emerald-500/20 left-1/2 -translate-x-1/2" />
              <div
                className={`absolute h-2.5 w-2.5 rounded-full border border-white ${
                  Math.abs(detectedPitch.midi - targetMidi) <= 1.5
                    ? "bg-emerald-500"
                    : "bg-rose-500"
                }`}
                style={{
                  left: `calc(50% + ${Math.min(50, Math.max(-50, (detectedPitch.midi - targetMidi) * 16))}% - 5px)`,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </CyberPanel>
  );
};
