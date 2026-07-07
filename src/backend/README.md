# Karaoke App — Backend

100% free/open-source stack. No paid APIs, no API keys.

## Architecture

```
frontend/            your existing React app (App.tsx, types.ts unchanged)
  src/lib/sdk.ts      <- NEW: real implementation, replaces the mock

backend/              FastAPI service
  pitch_extract.py     librosa pYIN -> pitchBlocks (scrolling note timeline)
  align_lyrics.py       Whisper ASR + fuzzy alignment -> krcLines (word-synced lyrics)
  main.py               REST API + song cache + scoring endpoints
  audio_cache/          downloaded/uploaded song audio
  song_cache/           processed Song JSON (pitch + lyrics), one file per song
```

**Why this shape:** pitch extraction and lyric alignment are the only parts
that need real compute, and both only need to run **once per song** — after
that the result is a small static JSON file. So the backend's job is really
just "ingest a song once, then serve cached JSON fast," which is why it's
cheap to self-host anywhere (a $5 VPS is plenty; the only heavy lift, Whisper
transcription, happens at ingest time, not at play time).

## 1. Backend setup

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

First run downloads the Whisper "base" model (~140MB, cached locally after
that — free, MIT-licensed, from openai-whisper).

## 2. Add a song (any CC/public-domain track + its lyrics)

Good free sources for vocal tracks with clear licensing: Musopen
(musopen.org), Free Music Archive (freemusicarchive.org, filter by CC
license), ccMixter (ccmixter.org), or your own recordings.

```bash
curl -X POST http://localhost:8000/api/songs \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Song Title",
    "artist": "Artist Name",
    "bpm": 118,
    "audio_url": "https://example.org/path/to/track.mp3",
    "lyrics": "First lyric line here\nSecond lyric line here\nThird line..."
  }'
```

Or upload a local file directly:

```bash
curl -X POST http://localhost:8000/api/songs/upload \
  -F "title=Song Title" \
  -F "artist=Artist Name" \
  -F "lyrics=$(cat lyrics.txt)" \
  -F "audio=@/path/to/track.mp3"
```

This runs the full pipeline (download → pYIN pitch extraction → Whisper
alignment) and caches the result. Takes roughly 0.3–1x the song's own
length to process on CPU with the "base" model; use `whisper_model: "tiny"`
for faster/rougher, `"small"`/`"medium"` for slower/more accurate.

Response: `{"id": "a1b2c3d4", "status": "ready", ...}` — that `id` is the
song's `lyricToken` / library id.

## 3. Frontend wiring

`sdk.ts` is a drop-in replacement, but three call sites in `App.tsx` need to
change because scoring now happens over the network (async) instead of being
a synchronous mock:

**a) Load the library on mount** (new `useEffect`, near the top of `App`):
```tsx
useEffect(() => {
  loadSongLibrary().then((songs) => {
    setQueueStates(Object.fromEntries(songs.map(s => [s.id, { state: "IDLE", progress: 0 }])));
  });
}, []);
```
(and change the `queueStates` initial value to `{}` instead of the hardcoded
`neon_drift`/etc. keys, since ids now come from the backend.)

**b) `handleSelectSong`** — fetch the full song (with krcLines/pitchBlocks)
before activating it, and point playback at the streamed audio:
```tsx
const handleSelectSong = async (song: Song) => {
  const fullSong = await fetchFullSong(song.id);
  setActiveSong(fullSong);
  // ...rest unchanged
};
```
Add an `<audio>` element (or Web Audio buffer source) using
`getAudioUrl(song.id)` as the source, wired to `isPlaying`/`currentTime` —
the mock version had no real audio playback since it had no real songs.

**c) Line-score and total-score calls** — both are now `async`. In the
playback loop, replace the synchronous `getPreviousScore(...)` call with:
```tsx
getPreviousScore(stateRef.current.activeSong, currentLineIdx, stateRef.current.userPitchHistory)
  .then((lineAccuracy) => {
    setScoreState((prev) => { /* same body as before */ });
  });
```
and in `handleSongFinished`, make it `async` and `await getTotalScore(...)`
before calling `setScoreState`.

## 4. Environment

Set `VITE_API_BASE` (e.g. in `.env`) if the backend isn't on
`http://localhost:8000/api` — e.g. for production:
```
VITE_API_BASE=https://your-backend-host.example.com/api
```

## Licensing notes

- librosa (ISC), openai-whisper (MIT), FastAPI (MIT), rapidfuzz (MIT) — all
  free/open-source with permissive licenses, safe to self-host and modify.
- You are responsible for only ingesting audio you have the rights to use
  (public domain / Creative Commons / your own recordings). This backend
  doesn't fetch or embed any copyrighted commercial tracks.
