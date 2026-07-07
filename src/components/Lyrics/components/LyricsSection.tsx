import React from "react";
import { Award } from "lucide-react";
import { theme } from "../../../../assets/themes";
import { CyberPanel } from "../../General/ui/CyberPanel";
import { useLyricSync, PitchPoint } from "../hooks/useLyricSync";
import { Song } from "../../../types";

// Define the exact props expected from the App level
interface LyricsSectionProps {
  activeSong: Song | null;
  currentTime: number;
  userPitchHistory: PitchPoint[];
  isSimulatedSinger: boolean;
  scoreState: {
    currentLineIndex: number;
    lineScores: Record<number, number>;
    totalScore: number;
  };
}

export const LyricsSection: React.FC<LyricsSectionProps> = ({
  activeSong,
  currentTime,
  userPitchHistory,
  isSimulatedSinger,
  scoreState,
}) => {
  // Call the hook locally inside the view using the values piped down from App
  const { currentSentenceBlock, calculateSyllableMatch } = useLyricSync(
    activeSong,
    currentTime,
  );

  const previousLineScore =
    scoreState.lineScores[scoreState.currentLineIndex - 1] ?? 0;

  // Composite Sub-Elements
  const headerMeta = <span className={theme.text.meta}>L-LYRIC ALIGNER</span>;

  const footer = (
    <>
      <span className="flex items-center gap-1">
        <span>ROOM CUMULATIVE AVERAGE:</span>
        <span className="text-white font-bold">{scoreState.totalScore}%</span>
      </span>
      <span className={theme.badge.success}>
        <Award className="w-3 h-3 text-emerald-400" /> STAGE ACCURACY
      </span>
    </>
  );

  return (
    <CyberPanel
      id="middle_lyrics_panel"
      headerTitle="KRC SYNCED LYRIC TELEPROMPTER"
      headerMeta={headerMeta}
      footer={footer}
    >
      {!activeSong ? (
        <span className={theme.text.placeholder} id="no_lyrics_message">
          [ no lyrics loaded ]
        </span>
      ) : (
        <div className="w-full flex flex-col gap-5 justify-center py-2 h-full">
          {/* Previous sentence block */}
          <div className="text-[11px] md:text-xs text-slate-600 font-mono italic select-none h-4 overflow-hidden uppercase tracking-wide">
            {currentSentenceBlock?.previousLine?.text || (
              <span className="opacity-0">-</span>
            )}
          </div>

          {/* Active dynamic lyrics block */}
          <div
            className="py-2.5 flex flex-wrap gap-x-2.5 gap-y-1.5 items-center justify-center"
            id="active_lyric_line_container"
          >
            {currentSentenceBlock?.currentLine ? (
              currentSentenceBlock.currentLine.words.map((word, wordIdx) => {
                const wStart = word.startTime;
                const wEnd = word.startTime + word.duration;

                const isActive = currentTime >= wStart && currentTime < wEnd;
                const isAfter = currentTime >= wEnd;

                // Use the hook method to determine accurate hitting status
                const isSyllableMatched =
                  (isAfter || isActive) &&
                  calculateSyllableMatch(
                    wStart,
                    wEnd,
                    userPitchHistory,
                    isSimulatedSinger,
                  );

                let textClass: string = theme.lyrics.upcoming;

                if (isActive) {
                  textClass = theme.lyrics.active;
                } else if (isAfter) {
                  textClass = isSyllableMatched
                    ? theme.lyrics.passedMatched
                    : theme.lyrics.passedMissed;
                }

                return (
                  <span
                    key={wordIdx}
                    className={`${textClass} transition-all duration-100 ease-out`}
                    style={{
                      textShadow: isActive
                        ? "0 0 10px rgba(0,243,255,0.4)"
                        : undefined,
                    }}
                  >
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

          {/* Next sentence block */}
          <div className="text-[11px] md:text-xs text-slate-600 font-mono italic select-none h-4 overflow-hidden uppercase tracking-wide">
            {currentSentenceBlock?.nextLine?.text || (
              <span className="opacity-0">-</span>
            )}
          </div>

          {/* Previous Sentence accuracy results */}
          {currentSentenceBlock !== null && scoreState.currentLineIndex > 0 && (
            <div className="pt-4 mt-2 border-t border-slate-900/40 w-full flex items-center justify-center gap-4 text-[10px]">
              <span className={theme.text.muted}>PREV LINE SCORE:</span>
              <span
                className={
                  previousLineScore >= 45
                    ? theme.badge.alert
                    : "text-rose-400 bg-rose-950/20 border-rose-500/30 font-mono font-black border px-2 py-0.5 rounded"
                }
              >
                {previousLineScore}% ACCURACY
              </span>
            </div>
          )}
        </div>
      )}
    </CyberPanel>
  );
};
