"""
main.py — Karaoke backend.

Endpoints:
  GET  /api/songs                 -> list song metadata (for the queue panel)
  GET  /api/songs/{song_id}       -> full Song object (krcLines + pitchBlocks)
  POST /api/songs                 -> add a new song {audio_url or audio file, title, artist, lyrics}
                                      runs pitch_extract.py + align_lyrics.py, caches result
  GET  /api/audio/{song_id}       -> stream the cached audio file
  POST /api/score/line            -> compute one line's accuracy (mirrors getPreviousScore)
  POST /api/score/total           -> compute rank from per-line scores (mirrors getTotalScore)

Everything here is free/open source: FastAPI, librosa (pYIN), Whisper (local),
yt-dlp only used against sources you point it at (e.g. your own CC uploads),
no paid services, no API keys required.

Run:
  pip install -r requirements.txt
  uvicorn main:app --host 0.0.0.0 --port 8000
"""
from __future__ import annotations

import json
import os
import uuid
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from pitch_extract import extract_pitch_blocks
from align_lyrics import align_lyrics_to_audio

BASE_DIR = Path(__file__).parent
AUDIO_DIR = BASE_DIR / "audio_cache"
SONG_DIR = BASE_DIR / "song_cache"
AUDIO_DIR.mkdir(exist_ok=True)
SONG_DIR.mkdir(exist_ok=True)

app = FastAPI(title="Karaoke Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this to your frontend origin in production
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Schemas ----------

class AddSongRequest(BaseModel):
    title: str
    artist: str
    description: str = ""
    bpm: int = 120
    audio_url: str  # direct URL to a CC/public-domain audio file (mp3/wav/ogg)
    lyrics: str  # plain lyrics, one line per newline
    album_art: Optional[str] = None
    whisper_model: str = "base"  # "tiny" for faster/cheaper, "small"/"medium" for better accuracy


class LineScoreRequest(BaseModel):
    target_blocks: list[dict]  # PitchBlock[]
    line_start: int
    line_end: int
    user_pitch_history: list[dict]  # PitchPoint[]


class TotalScoreRequest(BaseModel):
    line_scores: dict[str, float]
    total_lines: int


# ---------- Song library ----------

def _song_path(song_id: str) -> Path:
    return SONG_DIR / f"{song_id}.json"


@app.get("/api/songs")
def list_songs():
    songs = []
    for f in SONG_DIR.glob("*.json"):
        data = json.loads(f.read_text())
        songs.append({
            "id": data["id"],
            "title": data["title"],
            "artist": data["artist"],
            "duration": data["duration"],
            "bpm": data["bpm"],
            "description": data["description"],
            "albumArt": data["albumArt"],
        })
    return songs


@app.get("/api/songs/{song_id}")
def get_song(song_id: str):
    path = _song_path(song_id)
    if not path.exists():
        raise HTTPException(404, "Song not found")
    return json.loads(path.read_text())


@app.get("/api/audio/{song_id}")
def get_audio(song_id: str):
    for ext in ("mp3", "wav", "ogg", "m4a"):
        p = AUDIO_DIR / f"{song_id}.{ext}"
        if p.exists():
            return FileResponse(p)
    raise HTTPException(404, "Audio not found")


@app.post("/api/songs")
def add_song(req: AddSongRequest):
    """
    Full pipeline for onboarding ANY new CC-licensed song:
      1. Download the audio.
      2. Run pYIN pitch extraction -> pitchBlocks.
      3. Run Whisper + fuzzy alignment -> krcLines.
      4. Cache the finished Song JSON so future loads are instant (no
         re-processing) — this is the "minimal offline data" static artifact
         that lets the app be hosted anywhere without heavy runtime cost.
    """
    import requests
    import librosa

    song_id = str(uuid.uuid4())[:8]

    # 1. Download audio
    resp = requests.get(req.audio_url, timeout=60)
    resp.raise_for_status()
    ext = req.audio_url.split(".")[-1].split("?")[0][:4] or "mp3"
    audio_path = AUDIO_DIR / f"{song_id}.{ext}"
    audio_path.write_bytes(resp.content)

    # 2. Pitch extraction (pYIN, offline, ~real-time speed)
    pitch_blocks = extract_pitch_blocks(str(audio_path))

    # 3. Lyric alignment (Whisper ASR + fuzzy match to real lyrics)
    lyric_lines = [l for l in req.lyrics.splitlines() if l.strip()]
    krc_lines = align_lyrics_to_audio(str(audio_path), lyric_lines, model_size=req.whisper_model)

    duration_sec = int(librosa.get_duration(path=str(audio_path)))

    song = {
        "id": song_id,
        "title": req.title,
        "artist": req.artist,
        "duration": duration_sec,
        "bpm": req.bpm,
        "description": req.description,
        "albumArt": req.album_art or f"https://picsum.photos/seed/{song_id}/640/360",
        "lyricToken": song_id,
        "krcLines": krc_lines,
        "pitchBlocks": pitch_blocks,
    }

    _song_path(song_id).write_text(json.dumps(song, indent=2, ensure_ascii=False))
    return {"id": song_id, "status": "ready", "lines": len(krc_lines), "pitchBlocks": len(pitch_blocks)}


@app.post("/api/songs/upload")
async def add_song_from_upload(
    title: str = Form(...),
    artist: str = Form(...),
    lyrics: str = Form(...),
    bpm: int = Form(120),
    description: str = Form(""),
    whisper_model: str = Form("base"),
    audio: UploadFile = File(...),
):
    """Same pipeline as /api/songs but for a directly uploaded audio file."""
    import librosa

    song_id = str(uuid.uuid4())[:8]
    ext = (audio.filename or "song.mp3").split(".")[-1][:4] or "mp3"
    audio_path = AUDIO_DIR / f"{song_id}.{ext}"
    audio_path.write_bytes(await audio.read())

    pitch_blocks = extract_pitch_blocks(str(audio_path))
    lyric_lines = [l for l in lyrics.splitlines() if l.strip()]
    krc_lines = align_lyrics_to_audio(str(audio_path), lyric_lines, model_size=whisper_model)
    duration_sec = int(librosa.get_duration(path=str(audio_path)))

    song = {
        "id": song_id,
        "title": title,
        "artist": artist,
        "duration": duration_sec,
        "bpm": bpm,
        "description": description,
        "albumArt": f"https://picsum.photos/seed/{song_id}/640/360",
        "lyricToken": song_id,
        "krcLines": krc_lines,
        "pitchBlocks": pitch_blocks,
    }
    _song_path(song_id).write_text(json.dumps(song, indent=2, ensure_ascii=False))
    return {"id": song_id, "status": "ready", "lines": len(krc_lines), "pitchBlocks": len(pitch_blocks)}


# ---------- Scoring (mirrors sdk.ts mock semantics, now real) ----------

def _target_midi_at(pitch_blocks: list[dict], t: float) -> Optional[float]:
    for b in pitch_blocks:
        if b["startTime"] <= t <= b["startTime"] + b["duration"]:
            return b["pitch"]
    return None


@app.post("/api/score/line")
def score_line(req: LineScoreRequest):
    """
    Percentage of the user's captured pitch points, within [line_start, line_end],
    that fall within 1.5 semitones of the standard melody pitch at that instant.
    """
    points = [
        p for p in req.user_pitch_history
        if req.line_start <= p["time"] <= req.line_end
    ]
    if not points:
        return {"accuracy": 0}

    hits = 0
    for p in points:
        target = _target_midi_at(req.target_blocks, p["time"])
        if target is not None and abs(p["pitch"] - target) <= 1.5:
            hits += 1

    accuracy = round((hits / len(points)) * 100)
    return {"accuracy": accuracy}


@app.post("/api/score/total")
def score_total(req: TotalScoreRequest):
    if req.total_lines == 0:
        return {"pointTotal": 0, "rank": "--"}

    values = list(req.line_scores.values())
    point_total = round(sum(values) / len(values)) if values else 0

    if point_total >= 90:
        rank = "S"
    elif point_total >= 75:
        rank = "A"
    elif point_total >= 55:
        rank = "B"
    elif point_total >= 30:
        rank = "C"
    else:
        rank = "F"

    return {"pointTotal": point_total, "rank": rank}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
