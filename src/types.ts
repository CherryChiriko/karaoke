export interface KrcWord {
  text: string;
  startTime: number; // relative to absolute song start prefix (ms)
  duration: number; // in ms
}

export interface KrcLine {
  startTime: number; // relative to absolute song start prefix (ms)
  duration: number; // in ms
  words: KrcWord[];
  text: string;
  lineIndex: number;
}

export interface PitchBlock {
  startTime: number; // ms
  duration: number; // ms
  pitch: number; // MIDI number (e.g. 50 - 80)
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  duration: number; // in seconds
  bpm: number;
  description: string;
  albumArt: string; // generated graphic or gradient
  lyricToken: string;
  krcLines: KrcLine[];
  pitchBlocks: PitchBlock[];
}

export interface PitchPoint {
  time: number; // ms
  pitch: number; // MIDI value
  isMatched: boolean;
}

export type QueueState = "IDLE" | "ORDERED" | "DOWNLOADING" | "READY";

export interface QueueSong {
  song: Song;
  state: QueueState;
  downloadProgress: number; // 0 to 100
}

export interface ScoreState {
  currentLineIndex: number;
  lineScores: Record<number, number>; // index -> percentage (0 - 100)
  totalScore: number; // cumulative score
  rank: "S" | "A" | "B" | "C" | "F" | "--";
}
