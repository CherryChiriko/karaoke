import { useMemo } from "react";
import { Song } from "../../../types";

export interface LyricWord {
  text: string;
  startTime: number;
  duration: number;
}

export interface KrcLine {
  startTime: number;
  duration: number;
  words: LyricWord[];
  text: string;
}

export interface PitchPoint {
  time: number;
  pitch: number;
  isMatched: boolean;
}

export const useLyricSync = (activeSong: Song | null, currentTime: number) => {
  const currentSentenceBlock = useMemo(() => {
    if (!activeSong || !activeSong.krcLines) return null;

    const lines = activeSong.krcLines as KrcLine[];

    // Detect line index corresponding to current timestamp
    const activeIdx = lines.findIndex(
      (line) =>
        currentTime >= line.startTime &&
        currentTime <= line.startTime + line.duration,
    );

    // If no exact match, look for the closest upcoming line
    if (activeIdx === -1) {
      const nextLineIdx = lines.findIndex(
        (line) => line.startTime > currentTime,
      );
      return {
        active: false,
        previousLine: lines[nextLineIdx - 1] || null,
        currentLine: lines[nextLineIdx] || null,
        nextLine: lines[nextLineIdx + 1] || null,
        sentenceIndex: nextLineIdx,
      };
    }

    return {
      active: true,
      previousLine: lines[activeIdx - 1] || null,
      currentLine: lines[activeIdx] || null,
      nextLine: lines[activeIdx + 1] || null,
      sentenceIndex: activeIdx,
    };
  }, [activeSong, currentTime]);

  // Evaluates historical syllable match metrics for styling criteria
  const calculateSyllableMatch = (
    wStart: number,
    wEnd: number,
    userPitchHistory: PitchPoint[],
    isSimulatedSinger: boolean,
  ): boolean => {
    const wordHistory = userPitchHistory.filter(
      (h) => h.time >= wStart && h.time <= wEnd,
    );
    if (wordHistory.length > 0) {
      const matches = wordHistory.filter((m) => m.isMatched);
      return matches.length / wordHistory.length >= 0.35;
    }
    return isSimulatedSinger;
  };

  return {
    currentSentenceBlock,
    calculateSyllableMatch,
  };
};
