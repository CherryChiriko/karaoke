import { useState } from "react";
// Import your official types directly from global definitions
import { Song, QueueState } from "../../../types";

// External SDK import as referenced in your single file
declare const requestResource: (
  songId: string,
  progressCallback: (p: number) => void,
) => Promise<boolean>;

export const useSongQueue = (
  initialSongsList: string[],
  onSongSelected: (song: Song) => void,
  resetScoreState: () => void,
) => {
  const [activeSong, setActiveSong] = useState<Song | null>(null);
  const [tempoBpm, setTempoBpm] = useState<number>(120);

  // Use the global QueueState here
  const [queueStates, setQueueStates] = useState<
    Record<string, { state: QueueState; progress: number }>
  >(
    initialSongsList.reduce(
      (acc, id) => {
        acc[id] = { state: "IDLE", progress: 0 };
        return acc;
      },
      {} as Record<string, { state: QueueState; progress: number }>,
    ),
  );

  const handleOrderSong = async (songId: string) => {
    if (queueStates[songId]?.state !== "IDLE") return;

    setQueueStates((prev) => ({
      ...prev,
      [songId]: { state: "DOWNLOADING", progress: 0 },
    }));

    const result = await requestResource(songId, (p) => {
      setQueueStates((prev) => ({
        ...prev,
        [songId]: { state: "DOWNLOADING", progress: p },
      }));
    });

    if (result) {
      setQueueStates((prev) => ({
        ...prev,
        [songId]: { state: "READY", progress: 100 }, // Clean alignment with global READY status
      }));
    }
  };

  const handleSelectSong = (song: Song) => {
    setActiveSong(song);
    setTempoBpm(song.bpm);
    onSongSelected(song);
    resetScoreState();
  };

  return {
    activeSong,
    tempoBpm,
    queueStates,
    handleOrderSong,
    handleSelectSong,
  };
};
