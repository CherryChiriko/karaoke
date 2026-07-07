import React from "react";
import { Radio } from "lucide-react";

interface SessionLog {
  id: string;
  // Add other properties if your logs track dates/scores
}

interface HeaderProps {
  activeTab: "SING" | "HISTORY";
  setActiveTab: (tab: "SING" | "HISTORY") => void;
  sessionLogs: { length: number }; // 🔥 Just check for length instead of strict properties!
  setShowHelp: (show: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  sessionLogs,
  setShowHelp,
}) => {
  return (
    <header
      className="border-b border-cyan-500/10 bg-[#060b0d] px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0"
      id="room_header"
    >
      {/* Brand Left */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-cyan-950/40 border border-cyan-500/40 flex items-center justify-center relative shadow-[0_0_15px_rgba(6,182,212,0.15)] glow-animation">
          <Radio className="w-5 h-5 text-[#00f3ff] animate-pulse" />
          <div className="absolute inset-0 bg-[#00f3ff]/5 rounded-lg animate-ping pointer-events-none" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1
              className="text-xl md:text-2xl font-black tracking-widest text-slate-100 font-mono"
              id="app_title"
            >
              KARAOKE
            </h1>
            <span
              className="text-[9px] bg-cyan-500/10 hover:bg-cyan-500/20 text-[#00f3ff] border border-cyan-500/30 font-mono px-1.5 py-0.5 rounded cursor-pointer transition-all uppercase"
              onClick={() => setShowHelp(true)}
            >
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

        {/* Telemetry Status Badges */}
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
  );
};
