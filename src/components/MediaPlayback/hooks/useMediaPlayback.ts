import { Dispatch, SetStateAction } from "react";
import { Song, ScoreState, PitchPoint } from "../../../types";

interface UseMediaPlaybackProps {
  activeSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  isSimulatedSinger: boolean;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setIsSimulatedSinger: (sim: boolean) => void;
  setUserPitchHistory: Dispatch<SetStateAction<PitchPoint[]>>;
  setDetectedPitch: (pitch: any | null) => void;
  setTargetMidi: (midi: number | null) => void;
  setActiveSong: (song: Song | null) => void;
  setShowScoreModal: (show: boolean) => void;
  setScoreState: Dispatch<SetStateAction<ScoreState>>;
}

export const useMediaPlayback = ({
  activeSong,
  isPlaying,
  currentTime,
  isSimulatedSinger,
  setIsPlaying,
  setCurrentTime,
  setIsSimulatedSinger,
  setUserPitchHistory,
  setDetectedPitch,
  setTargetMidi,
  setActiveSong,
  setShowScoreModal,
  setScoreState,
}: UseMediaPlaybackProps) => {
  const handlePlayPause = () => {
    if (!activeSong) return;

    setIsPlaying(!isPlaying);
    // Loop reset fallback if track reached terminal position
    if (currentTime >= activeSong.duration * 1000) {
      setCurrentTime(0);
      setUserPitchHistory([]);
    }
  };

  const handleReboot = () => {
    setCurrentTime(0);
    setUserPitchHistory([]);
    setDetectedPitch(null);
    setScoreState((prev) => ({
      ...prev,
      lineScores: {},
      totalScore: 0,
      rank: "--",
    }));
  };

  const handleEject = () => {
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
      rank: "--",
    });
  };

  const handleToggleSimulation = () => {
    setIsSimulatedSinger(!isSimulatedSinger);
  };

  return {
    handlePlayPause,
    handleReboot,
    handleEject,
    handleToggleSimulation,
  };
};
