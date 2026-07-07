export const theme = {
  // Panel Layout Shells
  panel: {
    wrapper: "bg-[#060b0d] border border-cyan-500/15 rounded-xl overflow-hidden relative flex flex-col justify-between grow shadow-[0_4px_24px_rgba(3,7,8,0.4)]",
    header: "p-4 border-b border-cyan-500/10 bg-[#090f11] flex items-center justify-between shrink-0",
    footer: "bg-[#030607] border-t border-cyan-500/10 p-3.5 font-mono text-[10px] flex items-center justify-between text-slate-500 shrink-0",
  },
  
  // Typography Hierarchy
  text: {
    title: "font-mono text-xs font-bold text-slate-300 tracking-wider uppercase",
    meta: "font-mono text-[9px] text-[#00f3ff] font-bold uppercase tracking-widest leading-none",
    muted: "font-mono text-slate-500 uppercase",
    placeholder: "font-mono text-xs text-slate-600 block uppercase italic tracking-widest my-auto",
  },

  // Interactive Buttons
  button: {
    primary: "px-3 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/30 text-[#00f3ff] rounded font-mono text-[10px] font-bold flex items-center gap-1 leading-none shadow-sm transition-all active:scale-95",
    secondary: "px-3 py-1 rounded font-mono text-[10px] font-bold tracking-wider transition-all border bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300 active:scale-95",
    disabled: "px-3 py-1 rounded font-mono text-[10px] font-bold tracking-wider transition-all border bg-cyan-500/10 border-cyan-500/20 text-[#00f3ff] cursor-default opacity-60",
  },

  // Dynamic Lyric States
  lyrics: {
    upcoming: "text-slate-500 font-mono text-base md:text-lg transition-all duration-150 uppercase tracking-wide",
    active: "text-[#00f3ff] font-extrabold scale-105 shadow-[0_0_12px_rgba(0,243,255,0.2)] font-mono text-base md:text-xl underline decoration-[#00f3ff] decoration-2 underline-offset-4 tracking-wide",
    passedMatched: "text-emerald-400 font-bold font-mono text-base md:text-lg shadow-emerald-400/10 drop-shadow-[0_0_3px_#10b981] tracking-wide",
    passedMissed: "text-slate-300 font-mono text-base md:text-lg tracking-wide",
  },

  // Status Badges & Accents
  badge: {
    success: "text-emerald-500 font-bold uppercase flex items-center gap-1 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]",
    alert: "text-amber-400 bg-amber-950/20 border-amber-500/30 font-mono font-black border px-2 py-0.5 rounded",
  }
} as const;

export type theme = typeof theme;