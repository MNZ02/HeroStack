#!/usr/bin/env bash
#
# Cut a head-turn clip into the webp sequence the scrub reads.
#
#   ./scripts/extract-frames.sh assets-src/turn.mp4 0.95 3.85
#
# Args: <clip> <start seconds> <duration seconds>
# See ASSETS.md for how to pick the trim window.
set -euo pipefail

CLIP=${1:?usage: extract-frames.sh <clip> <start> <duration>}
START=${2:?usage: extract-frames.sh <clip> <start> <duration>}
DURATION=${3:?usage: extract-frames.sh <clip> <start> <duration>}

FRAMES=30
WIDTH=1600
QUALITY=82

ROOT=$(cd "$(dirname "$0")/.." && pwd)
OUT="$ROOT/public/frames"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

command -v ffmpeg >/dev/null || { echo "need ffmpeg — brew install ffmpeg" >&2; exit 1; }
command -v cwebp  >/dev/null || { echo "need cwebp — brew install webp"    >&2; exit 1; }

echo "cutting $FRAMES frames from ${START}s +${DURATION}s of $CLIP"

# Evenly spaced across the window. -frames:v caps the count, since the fps
# filter can round up and hand back one extra.
ffmpeg -v error -ss "$START" -t "$DURATION" -i "$CLIP" \
  -vf "fps=$FRAMES/$DURATION,scale=$WIDTH:-2" -frames:v "$FRAMES" \
  "$TMP/f_%02d.png"

# This ffmpeg build ships no libwebp encoder, so encode separately.
rm -rf "$OUT"
mkdir -p "$OUT"

i=0
for png in "$TMP"/f_*.png; do
  cwebp -quiet -q "$QUALITY" -m 6 "$png" -o "$OUT/turn_$(printf '%02d' $i).webp"
  i=$((i + 1))
done

echo "wrote $i frames to public/frames ($(du -sh "$OUT" | cut -f1))"
[ "$i" -eq "$FRAMES" ] || echo "warning: expected $FRAMES frames, got $i — update FRAME_COUNT in src/assets.ts" >&2
