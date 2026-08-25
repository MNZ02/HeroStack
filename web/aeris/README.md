# aeris

Respirator product hero. Move the cursor across the page and the subject turns
his head to follow it.

```bash
npm run dev --workspace=aeris     # http://localhost:5304
```

## What this study is actually about

Instead of seeking a `<video>` element on cursor movement, this study picks
a still out of a pre-extracted array of frames.

Scrubbing video directly looks like the obvious approach, but is often the wrong one:
long keyframe intervals mean arbitrary seeks must decode from the nearest keyframe,
causing seek latencies (>100ms) that bottleneck a 60fps RAF loop down to ~8fps.

Frames have no such cost. Selecting one is an array index lookup, and swapping which
of two nodes is opaque is the entire update.

It is also smaller: one direction as 30 webp stills is **768 KB**, against
**5.3 MB** for the mp4 they were cut from.

## How the mapping works

Cursor position maps across the viewport:

```
centre = innerWidth / 2
dead   = max(30, innerWidth * 0.05)
offset = pointerX - centre

|offset| <= dead  ->  hold frame 0, keep the previous facing
otherwise         ->  facing   = offset < 0 ? 'left' : 'right'
                      progress = min(1, (|offset| - dead) / (centre - dead))
                      index    = round(progress * (FRAME_COUNT - 1))
```

Pointer position is sampled on `mousemove` and applied on a RAF tick, so a fast
mouse cannot queue more work than one paint absorbs.

## Only one direction is downloaded

`public/frames/` holds a single turn. The opposite direction is those same
files under `scaleX(-1)` on the stage, so the second direction costs nothing to
download and cannot differ in quality from the first.

This works because the source still is near-symmetric on a flat white ground —
measured at 4px of centring difference and 6px between left and right head
clearance. On an asymmetric subject, or over a background with any directional
gradient, the mirror would read as a cut and you would need real footage for
both sides.

## The dead zone earns its keep twice

The band around centre is not only there to stop the sequence strobing between
directions when the cursor jitters. It is also **where the mirror flips** —
inside it the sequence holds on frame 0 and `facing` keeps its previous value,
so the horizontal flip always happens on the neutral pose, which is the one
frame that looks near-identical mirrored. Cross the centre and nothing visibly
changes; the swap is hidden by the frame it happens on.

## Layout notes

- **The chrome is white ink under `mix-blend-mode: difference`.** It resolves
  to black over the white ground and to white where it crosses the subject's
  black t-shirt. This is not a stylistic choice — the frames are full-bleed and
  the subject sweeps sideways under the cursor, so anything pinned to a corner
  eventually sits on top of him. Drawn in flat black, the price and the
  "move across the frame" hint disappeared into the garment entirely.
- The stage is `position: fixed` with `object-fit: cover`, so the frames need
  to be wider than the viewport aspect or the subject crops badly. The source
  is 16:9; at 1.6:1 it keeps full height and trims the sides.
- The scrub is desktop and hover-pointer only. Without a cursor there is
  nothing to drive it, so touch gets frame 0 alone and never downloads the
  other 29.
- No GSAP, no `motion` — one RAF loop and two style writes. The only thing that
  animates by itself is the stage fading in once every frame has decoded, and
  `prefers-reduced-motion` removes that.

## Assets

Frames are self-hosted and committed. `ASSETS.md` covers where they came from,
the rules a replacement clip has to satisfy, and `scripts/extract-frames.sh`
for cutting a new set.
