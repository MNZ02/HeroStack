# vision-reveal

Saiyan Studio — a single-screen hero built around one interaction: a cursor
spotlight that burns through Goku's base form to the Super Saiyan frame
underneath, in perfect registration.

```bash
npm run dev --workspace=vision-reveal
# or
npx turbo run dev --filter=vision-reveal
```

## Shape of the thing

Unlike `comicraft`, this study has **no build step to speak of** — no React, no
Tailwind, no GSAP. Everything is one hand-written `index.html`: tokens and
keyframes in a `<style>` block, behaviour in a single IIFE at the bottom.
Vite is here to serve it, copy `public/`, and minify the output. Keep it that
way; the point of this study is how far plain CSS and ~150 lines of DOM code
get you.

```
index.html            markup + all CSS + all JS
public/assets/        the two hero frames, served from /assets/*
```

## The reveal

Both frames are stacked absolutely and sized identically. The top layer
(`#reveal-img`, Super Saiyan) carries a `radial-gradient` **mask** that follows
the pointer, so the transformation is a hole punched in the base layer rather
than a crossfade. Registration is the whole trick — the two source images are
the same crop, so the mask edge never reveals a seam.

- `SPOTLIGHT_R` (280px) is the spotlight radius. The gradient holds full
  opacity to 35% and then falls off in four stops — the hard core is what sells
  it as a ki burst rather than a soft vignette.
- Pointer position is lerped into `smooth` and applied on `requestAnimationFrame`,
  so the light trails the cursor instead of snapping to it. The rAF loop is only
  running while the pointer is moving.
- Masks are set as inline styles on every frame. That's deliberate — a CSS
  custom property for the gradient centre would round-trip through the style
  recalc for no gain here.

## Motion, and opting out

The load sequence is CSS-only: a five-panel ki splash wipes off the top and
bottom halves, then the big `SAIYAN` wordmark, hero image, and CTA animate in
on staggered delays. The headline is the one exception — it's split into
`.word-reveal` spans in JS so each word gets its own `animationDelay`.

`prefers-reduced-motion` is honoured in both places: the per-word delays are
never applied, and the reveal layer is set to `opacity: 0` before any listener
is attached, so the spotlight never runs at all.

## Assets

`public/assets/goku-base.png` and `goku-ssj.jpg` are the shipped frames, copied
verbatim into `dist/assets/` at build time. They're referenced as root-absolute
paths (`/assets/…`) because that's how Vite's `public/` directory resolves —
relative paths build with a warning and only work by accident.

The `?v=3` query on both is a cache-buster from the original standalone
project. It's harmless; bump it if you re-export a frame.
