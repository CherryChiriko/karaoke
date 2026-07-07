"""
pitch_extract.py

Turns any audio file into a list of PitchBlocks (the scrolling note blocks the
frontend draws on the canvas), using librosa's pYIN pitch tracker.

pYIN is a probabilistic extension of the YIN algorithm (de Cheveigne & Kawahara,
2002 / Mauch & Dixon, 2014) shipped free with librosa. No API keys, no network
calls, runs entirely offline/locally. This is the same class of algorithm used
by open-source vocal-pitch tools like Tony/Sonic Annotator.

Output format matches frontend `PitchBlock`:
  { startTime: ms, duration: ms, pitch: midi_number }

Consecutive frames with the (rounded) same MIDI pitch are merged into a single
block, and short unvoiced/silent gaps are dropped, so the result is compact
enough to ship as a static JSON file per song.
"""
from __future__ import annotations

import numpy as np
import librosa


def extract_pitch_blocks(
    audio_path: str,
    hop_length: int = 512,
    fmin: str | float = "C2",
    fmax: str | float = "C6",
    min_block_ms: float = 60.0,
) -> list[dict]:
    """
    Run pYIN over the audio file and collapse the frame-level pitch curve
    into discrete note blocks suitable for the karaoke pitch timeline.
    """
    y, sr = librosa.load(audio_path, sr=None, mono=True)

    f0, voiced_flag, voiced_prob = librosa.pyin(
        y,
        fmin=librosa.note_to_hz(fmin) if isinstance(fmin, str) else fmin,
        fmax=librosa.note_to_hz(fmax) if isinstance(fmax, str) else fmax,
        sr=sr,
        hop_length=hop_length,
    )

    times = librosa.times_like(f0, sr=sr, hop_length=hop_length)

    # Convert Hz -> nearest MIDI integer per frame; NaN (unvoiced) -> None
    midi_frames: list[int | None] = []
    for hz, voiced in zip(f0, voiced_flag):
        if not voiced or hz is None or np.isnan(hz):
            midi_frames.append(None)
        else:
            midi_frames.append(int(round(librosa.hz_to_midi(hz))))

    # Collapse consecutive equal (or unvoiced) frames into blocks
    blocks: list[dict] = []
    current_pitch = None
    block_start_idx = 0

    def flush(end_idx: int):
        if current_pitch is None:
            return
        start_ms = float(times[block_start_idx] * 1000)
        end_ms = float(times[min(end_idx, len(times) - 1)] * 1000)
        duration = end_ms - start_ms
        if duration >= min_block_ms:
            blocks.append({
                "startTime": round(start_ms),
                "duration": round(duration),
                "pitch": current_pitch,
            })

    for i, pitch in enumerate(midi_frames):
        if pitch != current_pitch:
            flush(i)
            current_pitch = pitch
            block_start_idx = i
    flush(len(midi_frames))

    return blocks


if __name__ == "__main__":
    import sys, json

    if len(sys.argv) < 2:
        print("Usage: python pitch_extract.py <audio_file> [out.json]")
        sys.exit(1)

    audio_file = sys.argv[1]
    out_path = sys.argv[2] if len(sys.argv) > 2 else "pitch_blocks.json"

    result = extract_pitch_blocks(audio_file)
    with open(out_path, "w") as f:
        json.dump(result, f, indent=2)
    print(f"Wrote {len(result)} pitch blocks to {out_path}")
