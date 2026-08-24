#!/usr/bin/env bash
set -euo pipefail

# Extract scroll-scrub frames from the source video.
# Usage: [SRC=assets/fall.mp4] FPS=24 WIDTH=1280 QUALITY=3 npm run frames

FPS="${FPS:-24}"
WIDTH="${WIDTH:-1920}"
QUALITY="${QUALITY:-3}" # ffmpeg -qscale:v, 2 = best, 5 = smaller
SRC="${SRC:-assets/fall.mp4}"
OUT="public/frames"

command -v ffmpeg >/dev/null 2>&1 || { echo "ffmpeg not found" >&2; exit 1; }
[ -f "$SRC" ] || { echo "$SRC not found" >&2; exit 1; }

mkdir -p "$OUT"
rm -f "$OUT"/frame_*.jpg

ffmpeg -hide_banner -loglevel error -y \
  -i "$SRC" \
  -vf "fps=${FPS},scale=${WIDTH}:-2:flags=lanczos" \
  -qscale:v "${QUALITY}" \
  "$OUT/frame_%04d.jpg"

COUNT=$(ls "$OUT"/frame_*.jpg | wc -l | tr -d ' ')
echo "Extracted ${COUNT} frames at ${FPS}fps into ${OUT}/"
