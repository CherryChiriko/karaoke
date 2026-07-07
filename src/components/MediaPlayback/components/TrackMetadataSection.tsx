import React from "react";
import { Music, Play, Pause, RotateCcw, X } from "lucide-react";
import { CyberPanel } from "../../General/ui/CyberPanel";
import { theme } from "../../../../assets/themes";
import { Song } from "../../../types";

interface TrackMetadataSectionProps {
  activeSong: Song | null;
  currentTime: number;
  isPlaying: boolean;
  isSimulatedSinger: boolean;
  onPlayPause: () => void;
  onReboot: () => void;
  onEject: () => void;
  onToggleSimulation: () => void;
}

export const TrackMetadataSection: React.FC<TrackMetadataSectionProps> = ({
  activeSong,
  currentTime,
  isPlaying,
  isSimulatedSinger,
  onPlayPause,
  onReboot,
  onEject,
  onToggleSimulation,
}) => {
  const headerTitle = <span className={theme.text.title}>TRACK METADATA</span>;

  const headerMeta = (
    <span className="font-mono text-[10px] text-cyan-400 font-semibold uppercase">
      ACCOMPANIMENT PORT
    </span>
  );

  const footer = (
    <>
      <span>SYNC TIME: ONLINE</span>
      <span className="text-cyan-600 font-bold">128-BPM L-STATE</span>
    </>
  );

  return (
    <div className="lg:col-span-1 flex flex-col h-full">
      <CyberPanel
        id="left_metadata_panel"
        headerTitle={headerTitle}
        headerMeta={headerMeta}
        footer={footer}
        contentClassName="grow p-6 flex flex-col justify-between overflow-y-auto min-h-[300px]"
      >
        {!activeSong ? (
          <div className="my-auto text-center flex flex-col items-center justify-center p-4">
            <div className="w-16 h-16 rounded-full border border-dashed border-slate-700 flex items-center justify-center text-slate-400 mb-4 animate-spin-slow">
              <Music className="w-6 h-6 text-slate-500" />
            </div>
            <span className="font-mono text-xs font-extrabold tracking-widest text-[#00f3ff] block mb-2 uppercase">
              NO TRACK LOADED
            </span>
            <p className="text-gray-500 text-xs font-mono max-w-50 leading-relaxed">
              Select a song from the library queue on the right panel to begin →
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 md:h-full justify-between">
            <div className="flex flex-col gap-4">
              {/* Album Visual Art Track Graphic Card */}
              <div className="relative group rounded-lg overflow-hidden border border-slate-800 bg-[#030607]">
                <img
                  src={activeSong.albumArt}
                  alt={activeSong.title}
                  className="w-full aspect-video object-cover brightness-75 group-hover:brightness-90 transition-all duration-300"
                />
                <div className="absolute inset-0 bg-linear-to-t from-[#060b0d] to-transparent" />
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

              {/* Typography Header Descriptor */}
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

            {/* Time Sync Telemetry Deck */}
            <div className="bg-[#04080a] p-4 rounded-lg border border-cyan-500/15 flex flex-col gap-4 justify-end mt-auto">
              <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
                <span>ELAPSED PLAYTIME</span>
                <span className="text-cyan-400 font-bold">
                  {(currentTime / 1000).toFixed(1)}s / {activeSong.duration}.0s
                </span>
              </div>

              {/* Standard Media Timeline Progress Track */}
              <div className="w-full bg-[#030607] h-1.5 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="bg-[#00f3ff] h-full shadow-[0_0_8px_#00f3ff] transition-all duration-75"
                  style={{
                    width: `${Math.min(100, (currentTime / (activeSong.duration * 1000)) * 100)}%`,
                  }}
                />
              </div>

              {/* Control System Navigation Switches */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={onPlayPause}
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
                  onClick={onReboot}
                  className="py-2 bg-[#090f11] hover:bg-[#111c1f] text-slate-300 border border-slate-800 rounded font-mono text-[10px] font-bold tracking-wider flex items-center justify-center gap-1"
                  id="reset_song_button"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> REBOOT
                </button>

                <button
                  onClick={onEject}
                  className="py-2 bg-[#1a0f10] hover:bg-[#251517] text-rose-300 border border-rose-950 rounded font-mono text-[10px] font-bold tracking-wider flex items-center justify-center gap-1"
                  id="unload_song_button"
                >
                  <X className="w-3.5 h-3.5" /> EJECT
                </button>
              </div>

              {/* Assistive Singing Automation Module */}
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
                  onClick={onToggleSimulation}
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
      </CyberPanel>
    </div>
  );
};
