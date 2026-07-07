"""
align_lyrics.py

Produces KRC-style word-level lyric timing (KrcLine[] matching frontend
`types.ts`) for ANY song, given only:
  - an audio file
  - the plain lyrics text (one line per lyric line)

No paid aligner APIs. Approach (a lightweight open-source forced-alignment
substitute, since `aeneas` requires a fragile system-level `espeak` dependency
we want to avoid for easy hosting):

  1. Transcribe the audio with OpenAI's Whisper (open source, runs fully
     locally, MIT license) using `word_timestamps=True` to get an ASR guess
     with per-word start/end times.
  2. Sequence-align the ASR words against your ground-truth lyrics words
     using difflib's longest-common-subsequence matcher (stdlib, free) so we
     know which ASR timestamp corresponds to which real lyric word.
  3. For lyric words Whisper mis-heard (no direct match), linearly
     interpolate their timing between the nearest matched anchor words.
  4. Regroup words back into the original lyric lines to build KrcLine[].

This degrades gracefully: even on a bad transcription, every word still gets
*some* reasonable timestamp because of the interpolation step, and quality
improves automatically as Whisper's transcription accuracy does.
"""
from __future__ import annotations

import re
import difflib
from dataclasses import dataclass

import whisper


_WORD_RE = re.compile(r"[^\W_]+", re.UNICODE)


def _normalize(word: str) -> str:
    return _WORD_RE.sub("", word).lower()


@dataclass
class AsrWord:
    text: str
    start: float  # seconds
    end: float  # seconds


_whisper_model = None


def _get_model(model_size: str = "base"):
    global _whisper_model
    if _whisper_model is None:
        _whisper_model = whisper.load_model(model_size)
    return _whisper_model


def transcribe_words(audio_path: str, model_size: str = "base") -> list[AsrWord]:
    model = _get_model(model_size)
    result = model.transcribe(audio_path, word_timestamps=True)

    words: list[AsrWord] = []
    for segment in result["segments"]:
        for w in segment.get("words", []):
            text = w["word"].strip()
            if not text:
                continue
            words.append(AsrWord(text=text, start=float(w["start"]), end=float(w["end"])))
    return words


def align_lyrics_to_audio(
    audio_path: str,
    lyrics_lines: list[str],
    model_size: str = "base",
) -> list[dict]:
    """
    lyrics_lines: plain lyric text, one entry per line, e.g.
        ["Walking through the neon rain", "Chasing shadows down the lane", ...]

    Returns KrcLine[] JSON matching frontend types.ts:
        [{ startTime, duration, words: [{text, startTime, duration}], text, lineIndex }]
    All times are milliseconds relative to song start.
    """
    asr_words = transcribe_words(audio_path, model_size=model_size)
    asr_norm = [_normalize(w.text) for w in asr_words]

    # Flatten reference lyrics into (line_idx, word_text) pairs
    ref_tokens: list[tuple[int, str]] = []
    for line_idx, line in enumerate(lyrics_lines):
        for word in line.split():
            ref_tokens.append((line_idx, word))
    ref_norm = [_normalize(t[1]) for t in ref_tokens]

    matcher = difflib.SequenceMatcher(a=ref_norm, b=asr_norm, autojunk=False)
    matched: dict[int, AsrWord] = {}  # ref index -> matched ASR word
    for block in matcher.get_matching_blocks():
        for offset in range(block.size):
            ref_i = block.a + offset
            asr_i = block.b + offset
            matched[ref_i] = asr_words[asr_i]

    # Fill unmatched ref words by interpolating between nearest matched anchors
    n = len(ref_tokens)
    resolved: list[tuple[float, float]] = [None] * n  # (start_sec, end_sec)

    matched_indices = sorted(matched.keys())
    for i in range(n):
        if i in matched:
            w = matched[i]
            resolved[i] = (w.start, w.end)

    # Interpolate gaps
    default_word_dur = 0.35  # seconds, fallback when no anchors exist at all
    audio_total_end = asr_words[-1].end if asr_words else n * default_word_dur

    i = 0
    while i < n:
        if resolved[i] is not None:
            i += 1
            continue
        gap_start = i
        while i < n and resolved[i] is None:
            i += 1
        gap_end = i  # exclusive

        left_time = resolved[gap_start - 1][1] if gap_start > 0 else 0.0
        right_time = resolved[gap_end][0] if gap_end < n else audio_total_end
        span = max(right_time - left_time, 0.01)
        count = gap_end - gap_start
        step = span / count
        for k in range(count):
            s = left_time + step * k
            e = left_time + step * (k + 1)
            resolved[gap_start + k] = (s, e)

    # Rebuild KrcLine[] structures
    lines_out: dict[int, dict] = {}
    for i, (line_idx, word_text) in enumerate(ref_tokens):
        start_ms = round(resolved[i][0] * 1000)
        end_ms = round(resolved[i][1] * 1000)
        duration_ms = max(end_ms - start_ms, 10)

        if line_idx not in lines_out:
            lines_out[line_idx] = {
                "startTime": start_ms,
                "duration": 0,
                "words": [],
                "text": lyrics_lines[line_idx],
                "lineIndex": line_idx,
            }
        lines_out[line_idx]["words"].append({
            "text": word_text,
            "startTime": start_ms,
            "duration": duration_ms,
        })

    krc_lines = []
    for line_idx in sorted(lines_out.keys()):
        line = lines_out[line_idx]
        first_word = line["words"][0]
        last_word = line["words"][-1]
        line["startTime"] = first_word["startTime"]
        line["duration"] = (last_word["startTime"] + last_word["duration"]) - first_word["startTime"]
        krc_lines.append(line)

    return krc_lines


if __name__ == "__main__":
    import sys, json

    if len(sys.argv) < 3:
        print("Usage: python align_lyrics.py <audio_file> <lyrics.txt> [out.json]")
        sys.exit(1)

    audio_file = sys.argv[1]
    with open(sys.argv[2], encoding="utf-8") as f:
        lines = [l.strip() for l in f if l.strip()]

    out_path = sys.argv[3] if len(sys.argv) > 3 else "krc_lines.json"
    result = align_lyrics_to_audio(audio_file, lines)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    print(f"Wrote {len(result)} synced lines to {out_path}")
