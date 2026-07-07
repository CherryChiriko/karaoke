import React from "react";
import { Activity } from "lucide-react";
import { CyberPanel } from "../../General/ui/CyberPanel";
import { theme } from "../../../../assets/themes";
import { Song } from "../../../types";

interface PitchSectionProps {
  activeSong: Song | null;
  canvasContainerRef: React.RefObject<HTMLDivElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  canvasDimensions: { width: number; height: number };
}

export const PitchSection: React.FC<PitchSectionProps> = ({
  activeSong,
  canvasContainerRef,
  canvasRef,
  canvasDimensions,
}) => {
  // Composite Header Configuration
  const headerTitle = (
    <div className="flex items-center gap-2">
      <Activity className="w-4 h-4 text-cyan-400" />
      <span className={theme.text.title}>
        PITCH STAGE • ±1.0 SEMITONE OFFSET
      </span>
    </div>
  );

  const headerMeta = (
    <span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-800 text-[9px] font-mono font-bold text-cyan-400 uppercase">
      6s WINDOW
    </span>
  );

  // Composite Footer Configuration
  const footer = (
    <>
      <span>GRAPH INTERPOLATION: AUDIO-BOUND 20HZ</span>
      <span className="text-rose-500 font-bold uppercase flex items-center gap-1">
        <span>● VOICE LINE GRAPH</span>
        <span className="text-cyan-500 pl-1">● TARGET TRACKER BOUNDS</span>
      </span>
    </>
  );

  return (
    <CyberPanel
      id="middle_pitch_timeline"
      headerTitle={headerTitle}
      headerMeta={headerMeta}
      footer={footer}
    >
      <div
        ref={canvasContainerRef}
        className="w-full h-70 bg-[#090e11] relative overflow-hidden flex items-center justify-center border-b border-cyan-500/10"
      >
        {!activeSong ? (
          <div className="text-center font-mono p-6">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 block">
              PITCH GRAPH CHIP INACTIVE
            </span>
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
    </CyberPanel>
  );
};
