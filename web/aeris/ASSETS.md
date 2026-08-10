# Assets

`public/frames/turn_00.webp` … `turn_29.webp` is the whole art budget: 30 stills
of one head turn, 1600×902, 768 KB in total.

Nothing is fetched at runtime. There is no CDN and no image proxy — the frames
build into `dist/` and deploy with the page.

## Where they came from

An image model produced a single forward-facing still (1672×941, 16:9, flat
white ground, subject centred with clear headroom). That still was fed to a
video model as image-to-video with a locked camera, producing a 5s clip of the
subject turning his head to his left — which reads on screen as turning
*towards screen-right*.

That on-screen direction is what `FrameStage` mirrors against, and it is worth
confirming rather than inferring: open the last frame and look. A clip that
turns the other way needs the flip condition in `FrameStage` inverted, or the
subject ends up facing away from the cursor.

The source clip is **not in git** — it lives under `assets-src/`, which is
ignored. Keep a copy wherever you keep masters.

## Cutting frames from a new clip

Needs `ffmpeg` and `cwebp` (`brew install ffmpeg webp`). This ffmpeg build has
no libwebp encoder, hence the two-step through PNG.

```bash
./scripts/extract-frames.sh assets-src/turn.mp4 0.95 3.85
```

Arguments are the source clip, the start second, and the duration.

### Choosing the trim window

Generated clips ease in and out, and any time the head is *not* moving is
cursor travel that does nothing. Step through the clip first and find the
window where rotation is actually happening:

```bash
ffmpeg -i assets-src/turn.mp4 -vf fps=6 -q:v 2 /tmp/preview_%03d.jpg
```

The current clip held still for its first ~0.95s — a fifth of the runtime,
which would have made the first ~130px of cursor travel on each side dead.
Trimmed to 0.95–4.80 the remaining motion is close to linear, so evenly spaced
frames give an evenly paced scrub and no resampling is needed.

## Rules the frames have to keep

These are what the interaction depends on, not stylistic preferences:

- **Monotonic rotation.** The turn must never reverse. Frame index maps
  straight to cursor distance, so a clip that turns and returns would show the
  neutral pose at the far edge of the screen.
- **Locked camera, still body.** Only the head moves. Any drift shows up as a
  jump when the mirror flips at centre.
- **Frame 0 is the neutral pose.** Both directions rest on it, and the mirror
  flips while it is on screen — so it needs to be as close to symmetric as the
  subject allows.
- **Flat, even background.** It has to survive being mirrored without revealing
  a gradient running the wrong way.

## Regenerating

1. Drop the new clip in `assets-src/`.
2. Find the moving window (above).
3. Run `scripts/extract-frames.sh`.
4. If the frame count changes, update `FRAME_COUNT` in `src/assets.ts`.
