import React from "react";
import { CornerFrame } from "./CornerFrame"; // Assuming this exists nearby

interface CyberPanelProps {
  id?: string;
  headerTitle: React.ReactNode;
  headerMeta?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  contentClassName?: string;
}

export const CyberPanel: React.FC<CyberPanelProps> = ({
  id,
  headerTitle,
  headerMeta,
  footer,
  children,
  contentClassName = "p-8 flex flex-col justify-center items-center grow bg-gradient-to-b from-[#060b0d] to-[#04080a] text-center",
}) => {
  return (
    <section
      id={id}
      className="bg-[#060b0d] border border-cyan-500/15 rounded-xl overflow-hidden relative flex flex-col justify-between grow shadow-[0_4px_24px_rgba(3,7,8,0.4)]"
    >
      <CornerFrame />

      {/* HEADER */}
      <div className="p-4 border-b border-cyan-500/10 bg-[#090f11] flex items-center justify-between shrink-0">
        <div className="font-mono text-xs font-bold text-slate-300 tracking-wider">
          {headerTitle}
        </div>
        {headerMeta && (
          <div className="font-mono text-[9px] text-[#00f3ff] font-bold uppercase tracking-widest leading-none">
            {headerMeta}
          </div>
        )}
      </div>

      {/* CONTENT INNER BODY */}
      <div className={contentClassName}>{children}</div>

      {/* FOOTER */}
      {footer && (
        <div className="bg-[#030607] border-t border-cyan-500/10 p-3.5 font-mono flex items-center justify-between text-slate-500 shrink-0 text-[10px]">
          {footer}
        </div>
      )}
    </section>
  );
};
