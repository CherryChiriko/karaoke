import React from "react";
import { Download, ExternalLink } from "lucide-react";
import { CyberPanel } from "../../General/ui/CyberPanel";
import { theme } from "../../../../assets/themes";
import { Song, QueueState } from "../../../types";

interface SongQueueSectionProps {
  songLibrary: Song[];
  queueStates: Record<string, { state: QueueState; progress: number }>;
  activeSong: Song | null;
  handleOrderSong: (id: string) => void;
  handleSelectSong: (song: Song) => void;
  setShowHelp: (show: boolean) => void;
}

export const SongQueueSection: React.FC<SongQueueSectionProps> = ({
  songLibrary,
  queueStates,
  activeSong,
  handleOrderSong,
  handleSelectSong,
  setShowHelp,
}) => {
  const headerTitle = (
    <div className="flex items-center gap-2">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      <span className={theme.text.title}>SONG BOARD QUEUE</span>
    </div>
  );

  const headerMeta = (
    <span className="text-slate-500 text-[10px]">
      {songLibrary.length} TRACKS
    </span>
  );

  const footer = (
    <div className="w-full flex flex-col gap-1.5 text-[8px] font-mono">
      <div className="flex justify-between items-center w-full">
        <span>API SYSTEM HANDLERS</span>
        <span
          className="text-[#00f3ff] hover:underline cursor-pointer flex items-center gap-0.5"
          onClick={() => setShowHelp(true)}
        >
          VIEW SCHEMATICS <ExternalLink className="w-2.5 h-2.5" />
        </span>
      </div>
      <p className="text-[7.5px] text-slate-500 italic block border-t border-slate-900/60 pt-1 uppercase">
        POWERED BY GETSTANDARDPITCH • GETCURRENTTPITCH • GETKRCPLYRICBYTOKEN •
        GETPREVIOUSSCORE
      </p>
    </div>
  );

  return (
    <CyberPanel
      id="right_song_library_section"
      headerTitle={headerTitle}
      headerMeta={headerMeta}
      footer={footer}
      contentClassName="p-4 flex flex-col gap-3 grow overflow-y-auto max-h-[300px]"
    >
      {songLibrary.map((song) => {
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

              {/* Action State Switching aligned perfectly with your global definitions */}
              <div className="shrink-0">
                {q.state === "IDLE" ? (
                  <button
                    onClick={() => handleOrderSong(song.id)}
                    className={theme.button.primary}
                  >
                    <Download className="w-3 h-3" /> ORDER
                  </button>
                ) : q.state === "DOWNLOADING" ? (
                  <div className="px-2.5 py-1 bg-slate-900 border border-slate-800 text-slate-400 rounded font-mono text-[10px] flex items-center gap-1.5 animate-pulse">
                    <span>缓冲 {q.progress}%</span>
                  </div>
                ) : (
                  /* Catches "READY" (and "ORDERED" fallback states gracefully) */
                  <button
                    onClick={() => handleSelectSong(song)}
                    disabled={isCurrent}
                    className={
                      isCurrent ? theme.button.disabled : theme.button.secondary
                    }
                  >
                    {isCurrent ? "ACTIVE" : "SELECT"}
                  </button>
                )}
              </div>
            </div>

            {/* Progress Visual Track */}
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
    </CyberPanel>
  );
};
