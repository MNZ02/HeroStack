# Comicraft Studio

Samurai / Japan-themed portfolio landing page. Vite + React 19, Tailwind v4, GSAP.

A workspace of the [motionsite-clone](../../README.md) monorepo. Install from
the repo root, not here — npm hoists the dependencies.

```bash
npm install                             # at the repo root, once

npx turbo run dev  --filter=comicraft   # http://localhost:5173
npx turbo run build --filter=comicraft
npx turbo run lint  --filter=comicraft
```

Running `npm run dev` inside this directory also works and skips Turborepo
entirely, which is handy when you only care about this one project.

## Layout

```
PROMPT.md                  full spec — rebuilds this page 1:1 from scratch
ASSETS.md                  Cloudinary hosting runbook for the hero art
scripts/upload-assets.sh   publishes the PNG masters to Cloudinary
assets-src/                full-quality PNG masters (gitignored)
public/assets/hero-bg.{webp,jpg}       the samurai scene
public/assets/hero-bg-bnw.{webp,jpg}   the same frame in black and white
src/
  sections/Hero.jsx         the hero: scene, scrims, masthead, copy, CTA
  components/
    BrandMark.jsx           Comicraft logo + wordmark
    CursorLens.jsx          cursor-following black-and-white reveal
    SideRail.jsx            left-edge "THE SHADOWS" rail
    Divider.jsx             red hairline with diamond caps
  lib/motion.js             GSAP + ScrollTrigger setup, pointer tracking
  index.css                 design tokens (@theme) and base styles
```

## Design tokens

Defined in `src/index.css` under `@theme`, so they're usable as Tailwind
utilities (`bg-ink`, `text-blood`, `font-display`, …).

| Token | Value | Use |
| --- | --- | --- |
| `ink` | `#050505` | page and scrim base |
| `bone` | `#f2efe9` | headline and primary text |
| `fog` | `#b9b9bd` | body copy |
| `blood` | `#d10a10` | accent, CTA, rules |
| `font-display` | Cormorant Garamond | headlines and lead |
| `font-sans` | Jost | eyebrows, labels, body |

## Hero notes

- The background sits in a `z-0` layer, not `-z-10` — a negative index falls
  behind the section's own `bg-ink` fill and renders the scene black.
- Four scrims stack over the artwork: a right-weighted horizontal gradient
  (behind the copy), a vertical top/bottom gradient, a soft vignette, and a
  narrow-screen-only band. They multiply, so raising any one darkens the whole
  scene fast — the left two thirds are deliberately left near-transparent to
  keep the figure visible.
- That last scrim exists because below `lg` the copy centres over the brightest
  part of the scene, which is exactly where the right-weighted scrim does the
  least work. Without it the body copy sits on mist at poor contrast.
- A film-grain overlay sits above the scrims (an inline SVG turbulence tile, no
  extra request). It is doing real work, not just texture: it dithers the
  banding the large flat gradients would otherwise show on the dark sky.
- Motion: a load timeline (scene ken-burns, masked headline lines, staggered
  fades), scrubbed scroll parallax, and pointer parallax that drifts the scene
  and copy against each other. All of it is skipped under
  `prefers-reduced-motion`, where elements snap to their end state.
- The headline uses `clamp(2.15rem, 7vw, 4.4rem)`. Larger values overflow the
  masked lines at desktop widths.

## Images

Both frames ship as WebP with a JPEG fallback, served through `<picture>`.
The source PNGs were 1.7MB and 1.9MB; the WebPs are ~100KB each, so a desktop
visit pulls ~200KB of image instead of 3.6MB. They were generated with:

```bash
npx sharp-cli -i hero-bg.png     -o . -f webp -q 88
npx sharp-cli -i hero-bg-bnw.png -o . -f webp -q 82
npx sharp-cli -i hero-bg.png     -o . -f jpeg -q 84
npx sharp-cli -i hero-bg-bnw.png -o . -f jpeg -q 82
```

Quality is deliberately high for the colour frame: it is the LCP element and
the sky is a smooth gradient, which is where WebP shows banding first. It is
also preloaded in `index.html` so the fetch starts before the JS parses.

The black-and-white frame is not requested at all unless the lens can run —
see below.

## Cursor lens

`CursorLens` reveals `hero-bg-bnw.png` through a window that trails the cursor.
Both frames are the same 1672×941 render, so they line up exactly.

The lens is meant to go unnoticed as an object: no border, no shadow, and no
shape you can point at. It is a 460px square element masked by a single radial
gradient, so nothing straight or cornered ever shows.

The intermediate alpha stops in that gradient do the real work. The mask is
fully opaque only inside ~22% of the radius and then spends the rest of it
partly transparent, so the black-and-white copy blends into the colour one
across roughly 240px instead of arriving at an edge. Measured across the
radius, saturation runs 0.004 → 0.06 → 0.17 → 0.36 → 0.53 → 0.80 — a ramp, not
a step. Collapsing those stops toward `#000 0%, transparent 100%` brings a
visible disc back.

Three things keep the registration honest, and all three are load-bearing:

1. The lens renders **inside** the scene's transform group, next to the colour
   image. Anything outside that group drifts by up to 22px when the pointer
   parallax moves — enough to show a visible seam.
2. The inner copy is translated by exactly the negative of the lens position
   every frame, which is what pins the revealed region to the artwork beneath.
   It is sized to the scene box (not the lens), so it needs `max-w-none` to
   escape Tailwind's preflight `img { max-width: 100% }`.
3. Cursor position is converted from viewport to scene coordinates **in the
   render loop**, dividing out the scene's current scale — not at pointermove
   time, or the lens falls behind the parallax between events.

Neither image carries a `scale-105` overscan class. CSS applies the `scale`
property *after* `transform`, so a Tailwind scale would multiply GSAP's
translations on one image but not the other and pull them apart. The group uses
`-inset-6` for overscan instead.

`CursorLens` uses `useEffect`, not `useLayoutEffect`: layout effects run
child-before-parent, so `sceneRef.current` is still null at that point and the
effect silently does nothing.

The component renders `null` until an effect confirms `(hover: hover)` and no
reduced-motion preference. That gate is what keeps the second image off phones
entirely — returning early from the wiring effect alone would still have left
the `<img>` in the tree and downloaded it.

## Still to build

`writing-fg.png` in Downloads is the full-page mockup — the sections after the
hero come from it: Comic Creation Workflow (4 steps), Featured Works (4 cards),
From Sketch to Masterpiece, and the closing CTA band. `App.jsx` has the anchor
stub where they go.
