# Build prompt — Comicraft Studio hero

A self-contained specification for rebuilding this page 1:1. Everything below
is exact: colours, class strings, timeline offsets and easings are the real
values, not approximations. Where a value looks arbitrary it usually is not —
the "Invariants" section explains the ones that break the page if changed.

---

## 0. Assets

Two images, the same 1672×941 render in two grades. They must be
pixel-identical in framing — the whole cursor effect depends on the colour and
black-and-white frames registering exactly.

They are hosted on Cloudinary as two full-quality PNG masters; the four files
the build needs are derived from them on request. Fetch all four into
`public/assets/` under exactly these names:

```bash
mkdir -p public/assets && cd public/assets
CDN="https://res.cloudinary.com/g05cmote/image/upload"

curl -fsSL "$CDN/f_webp,q_88/comicraft/hero-bg.webp"     -o hero-bg.webp
curl -fsSL "$CDN/f_jpg,q_84/comicraft/hero-bg.jpg"       -o hero-bg.jpg
curl -fsSL "$CDN/f_webp,q_82/comicraft/hero-bg-bnw.webp" -o hero-bg-bnw.webp
curl -fsSL "$CDN/f_jpg,q_82/comicraft/hero-bg-bnw.jpg"   -o hero-bg-bnw.jpg

ls -l   # expect four files, roughly 100–170KB each
```

| File | Delivered | Role |
| --- | --- | --- |
| `hero-bg.webp` | ~117KB | colour scene, the LCP element |
| `hero-bg.jpg` | ~139KB | colour fallback |
| `hero-bg-bnw.webp` | ~127KB | black-and-white scene, revealed by the lens |
| `hero-bg-bnw.jpg` | ~162KB | black-and-white fallback |

The quality values are not uniform on purpose. The colour frame is encoded
higher because it is the LCP element and its sky is a smooth gradient, which is
where WebP shows banding first.

> The **first** request for each derivation is slow — Cloudinary is generating
> it — and every later one is cached; do not mistake that for a hang. Check all
> four files arrived at a plausible size before building, because a truncated
> download surfaces much later as a broken lens.
>
> `ASSETS.md` is the runbook for the hosting account, if you need to stand up
> your own or re-upload the masters.

<details>
<summary>Regenerating locally instead of using the derivations</summary>

Cloudinary's encoder is not sharp's, so the derived files are visually
equivalent to the reference build but not byte-identical. If you want exactly
the reference bytes, pull the masters and convert them yourself:

```bash
curl -fsSL "$CDN/comicraft/hero-bg.png"     -o hero-bg.png
curl -fsSL "$CDN/comicraft/hero-bg-bnw.png" -o hero-bg-bnw.png
```

Both are 1672×941. Convert with:

```bash
npx sharp-cli -i hero-bg.png     -o . -f webp -q 88
npx sharp-cli -i hero-bg-bnw.png -o . -f webp -q 82
npx sharp-cli -i hero-bg.png     -o . -f jpeg -q 84
npx sharp-cli -i hero-bg-bnw.png -o . -f jpeg -q 82
```

Then delete the PNGs from `public/assets/` — they are ~1.8MB each and
`public/` is copied verbatim into the build.

</details>

**Subject** (only if you must regenerate the art from scratch — note the two
frames must be pixel-identical in framing, so grade one render twice rather
than generating two images): a lone samurai in a straw kasa
and dark lamellar armour, seated on a riverbank, back to camera, facing a dark
horse standing in mist across shallow water. Red maple overhangs both edges of
the frame; red grass in the foreground. Everything is desaturated slate-grey
except the reds. Overcast, cinematic, shallow depth of field.

---

## 1. Stack

- Vite + React 19 (JavaScript, not TypeScript)
- Tailwind CSS v4 via `@tailwindcss/vite` — no `tailwind.config.js`; tokens
  live in an `@theme` block in the CSS
- GSAP with the ScrollTrigger plugin
- oxlint for `npm run lint`

```bash
npm create vite@latest . -- --template react
npm install tailwindcss @tailwindcss/vite gsap
```

`vite.config.js` registers both plugins:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({ plugins: [react(), tailwindcss()] })
```

## 2. File tree

```
index.html
public/assets/hero-bg.{webp,jpg}
public/assets/hero-bg-bnw.{webp,jpg}
src/
  main.jsx
  App.jsx
  index.css
  lib/motion.js
  sections/Hero.jsx
  components/
    BrandMark.jsx
    CursorLens.jsx
    SideRail.jsx
    Divider.jsx
```

`App.jsx` renders `<Hero />` inside `<main className="relative min-h-svh bg-ink">`
followed by `<section id="works" className="h-px w-full" aria-hidden="true" />`
as the anchor target for the CTA and scroll cue.

---

## 3. Design tokens

In `src/index.css`, after `@import 'tailwindcss';`:

```css
@theme {
  --color-ink: #050505;
  --color-ink-soft: #0d0d0e;
  --color-ash: #16161a;
  --color-fog: #b9b9bd;
  --color-bone: #f2efe9;
  --color-blood: #d10a10;
  --color-blood-deep: #8c0509;
  --color-blood-glow: #ff2b2b;

  --font-display: 'Cormorant Garamond', 'Times New Roman', serif;
  --font-sans: 'Jost', ui-sans-serif, system-ui, sans-serif;

  --ease-silk: cubic-bezier(0.22, 1, 0.36, 1);
}
```

Base layer: `html { scroll-behavior: smooth }`; body gets `bg-ink`, `text-bone`,
`font-sans`, `-webkit-font-smoothing: antialiased`, `overflow-x: hidden`;
`::selection` is blood on bone.

Utilities layer adds `.writing-vertical { writing-mode: vertical-rl;
text-orientation: mixed; }`.

Fonts load from Google Fonts in `index.html` with `preconnect` to both
`fonts.googleapis.com` and `fonts.gstatic.com` (the latter `crossorigin`):

```
Cormorant+Garamond:wght@300;400;500;600
Jost:wght@300;400;500;600
display=swap
```

`index.html` also preloads the LCP image, before the font links:

```html
<link rel="preload" as="image" href="/assets/hero-bg.webp"
      type="image/webp" fetchpriority="high" />
```

Title: `Comicraft Studio — Comic Designer & Illustrator`.

---

## 4. CSS primitives

```css
.reveal { opacity: 0; }   /* GSAP animates up from this; see §8 */

.grain {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E");
  background-repeat: repeat;
}

.scroll-tick { animation: scroll-tick 2.4s var(--ease-silk) infinite; }

@keyframes scroll-tick {
  0%        { transform: translateY(-100%); }
  55%, 100% { transform: translateY(1000%); }
}

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .reveal { opacity: 1 !important; transform: none !important; }
  .scroll-tick { animation: none; }
}
```

---

## 5. Hero structure

`<section id="hero" className="relative flex min-h-svh w-full flex-col overflow-hidden bg-ink">`

### 5.1 Scene

```
div.absolute.inset-0.z-0.overflow-hidden          ← clip
  div[ref=scene].absolute.-inset-6.will-change-transform   ← transform group
    picture > source[webp] + img
    <CursorLens sceneRef={scene} …/>
  4 × scrim divs
  div.grain.absolute.inset-0.opacity-[0.16].mix-blend-overlay
```

The `<img>` carries
`size-full object-cover object-[30%_50%] lg:object-center` and
`fetchPriority="high"`, with alt text describing the scene.

Scrims, in order, each `absolute inset-0`:

1. `bg-[linear-gradient(to_left,rgba(5,5,5,0.9)_0%,rgba(5,5,5,0.55)_35%,rgba(5,5,5,0.1)_65%,transparent_100%)]`
2. `bg-[linear-gradient(to_top,rgba(5,5,5,0.88)_0%,transparent_42%,transparent_74%,rgba(5,5,5,0.5)_100%)]`
3. `bg-[radial-gradient(ellipse_at_50%_45%,transparent_45%,rgba(5,5,5,0.5)_100%)]`
4. `bg-[linear-gradient(to_bottom,transparent_0%,rgba(5,5,5,0.62)_26%,rgba(5,5,5,0.62)_70%,transparent_100%)] lg:hidden`

Scrim 4 is narrow-screen only: below `lg` the copy centres over the brightest
part of the scene, exactly where scrim 1's right-weighting does the least work.
Without it the body copy sits on mist at poor contrast.

These multiply. Raising any one darkens the whole scene fast, so the left two
thirds are deliberately near-transparent to keep the figure visible.

### 5.2 Masthead

`<header className="relative z-20 flex items-start justify-between px-6 pt-7 sm:px-10 lg:px-16 lg:pt-10 xl:px-24">`
containing an empty `<span aria-hidden="true" />` and then
`<BrandMark data-brand className="reveal" />`, so the mark sits right.

### 5.3 Copy column

Outer: `relative z-10 flex flex-1 items-center px-6 py-16 sm:px-10 lg:px-16 xl:px-24`
Inner `[ref=copy]`: `ml-auto w-full max-w-2xl text-center will-change-transform lg:text-right`

| Element | Content | Classes |
| --- | --- | --- |
| Eyebrow `<p data-fade>` | `VISUAL STORYTELLER` | `reveal font-sans text-[0.7rem] font-light tracking-[0.42em] text-bone/85 sm:text-sm sm:tracking-[0.5em]` |
| Headline wrapper `<div>` | — | `mt-5 lg:inline-block lg:text-right` |
| `<h1>` | two masked lines | `font-display text-[clamp(2.15rem,7vw,4.4rem)] font-light leading-[1.02] tracking-[0.01em] text-bone uppercase` |
| Rule `<span data-rule>` | — | `mx-auto mt-7 block h-px w-20 origin-center bg-blood lg:ml-0 lg:origin-left` |
| Lead `<p data-fade>` | `Crafting Visual Legends, One Panel at a Time.` | `reveal mx-auto mt-7 max-w-xl font-display text-xl text-bone/95 sm:text-2xl lg:mr-0` |
| Body `<p data-fade>` | see below | `reveal mx-auto mt-5 max-w-md font-sans text-sm font-light leading-relaxed text-fog sm:text-[0.95rem] lg:mr-0` |
| CTA wrapper `<div data-fade>` | — | `reveal mt-10 lg:flex lg:justify-end` |

Headline lines: `Comic Designer` then `<span className="text-blood">&amp;</span> Illustrator`.

Body copy: *From concept to final frame, I bring stories to life with dynamic
art, expressive characters, and cinematic storytelling.*

The headline wrapper is `lg:inline-block` so it shrink-wraps to the text and
the red rule can hang off the headline's left edge rather than the column's.

`MaskedLine` is a local helper — an outer `span.block.overflow-hidden.pb-[0.08em]`
wrapping an inner `span[data-headline].block`. The overflow mask is what the
slide-up animation rides in.

### 5.4 CTA

```
<a href="#works"
   class="group relative inline-flex items-center gap-5 overflow-hidden bg-blood
          px-9 py-4 font-sans text-xs font-medium tracking-[0.28em] text-bone
          transition-colors duration-500 hover:bg-blood-deep
          focus-visible:outline-2 focus-visible:outline-offset-4
          focus-visible:outline-bone sm:px-11 sm:py-5 sm:text-sm">
```

Three children:

1. Sheen sweep — `absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-full`
2. `<span className="relative">VIEW PORTFOLIO</span>`
3. An 8-point star, `viewBox="0 0 24 24"`, `fill="currentColor"`,
   `class="relative size-4 transition-transform duration-500 group-hover:rotate-90"`,
   path `M12 1.5 13.9 9 21.5 12 13.9 15 12 22.5 10.1 15 2.5 12 10.1 9z`

The focus ring is **bone, not blood** — a red ring on a red button is invisible.

### 5.5 Scroll cue

An `<a data-fade href="#works">` with
`reveal group relative z-10 mx-auto flex flex-col items-center gap-3 pb-6 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bone`:

- `SCROLL` — `font-sans text-[0.6rem] font-light tracking-[0.4em] text-fog transition-colors duration-500 group-hover:text-bone`
- a track — `relative h-10 w-px overflow-hidden bg-bone/15` containing
  `span.scroll-tick.absolute.inset-x-0.top-0.h-4.bg-blood`

### 5.6 Divider row

`<div data-divider className="reveal relative z-10 px-6 pb-8 sm:px-10 lg:px-16 xl:px-24">`
wrapping `<Divider />`.

---

## 6. Components

**`BrandMark({ className, ...props })`** — `flex items-center gap-3`.
A 32×32 open-book glyph, `fill="none" stroke="currentColor" strokeWidth="1.6"`
with round caps and joins, `className="h-8 w-8 shrink-0 text-blood"`, two paths:

```
M4 6h7.5a4.5 4.5 0 0 1 4.5 4.5V27a3.5 3.5 0 0 0-3.5-3.5H4z
M28 6h-7.5a4.5 4.5 0 0 0-4.5 4.5V27a3.5 3.5 0 0 1 3.5-3.5H28z
```

Then a `<span className="leading-none">` holding `COMICRAFT`
(`block font-sans text-[0.95rem] font-medium tracking-[0.22em] text-bone`) over
`STUDIO` (`mt-1 block text-right font-sans text-[0.6rem] font-light tracking-[0.42em] text-fog`).
It must spread `...props` onto the root so `data-brand` reaches the DOM.

**`SideRail()`** — `aria-hidden`, `pointer-events-none absolute inset-y-0 left-6 z-20 hidden flex-col items-center justify-center gap-6 py-20 lg:left-10 lg:flex`:

- `span[data-rail-label]` — `writing-vertical rotate-180 font-sans text-[0.65rem] font-light tracking-[0.55em] text-fog/80`, text `THE SHADOWS`
- `span[data-rail-line]` — `w-px flex-1 origin-top bg-gradient-to-b from-blood via-blood/45 to-blood/10`
- `span[data-rail-diamond]` — `mb-2 size-2 rotate-45 bg-blood`

**`Divider({ className })`** — `aria-hidden`, `flex w-full items-center gap-3`:
a `size-1.5 shrink-0 rotate-45 bg-blood` diamond, an
`h-px flex-1 bg-gradient-to-r from-blood/60 via-blood/25 to-blood/60` rule,
and a second diamond.

---

## 7. `lib/motion.js`

Registers ScrollTrigger and exports `gsap`, `ScrollTrigger`, plus:

- `prefersReducedMotion()` — matchMedia `(prefers-reduced-motion: reduce)`,
  guarded on `typeof window`.
- `trackPointer(onMove)` — attaches a passive `pointermove` on `window`,
  normalises to `[-1, 1]` on both axes
  (`(clientX / innerWidth) * 2 - 1`), calls `onMove(x, y)`, returns a
  cleanup function. Returns a no-op when there is no window, under reduced
  motion, or on `(pointer: coarse)`.

---

## 8. Motion

All of it inside one `gsap.context(…, root)` in a `useLayoutEffect`, returning
`ctx.revert()`. Under reduced motion the effect does
`gsap.set(q('.reveal'), { opacity: 1, y: 0, yPercent: 0 })` and returns
immediately.

### 8.1 Load timeline

`gsap.timeline({ defaults: { ease: 'power3.out' }, delay: 0.15 })`

| Target | From → To | Duration | Ease | At |
| --- | --- | --- | --- | --- |
| `scene` | `scale 1.14, opacity 0` → `scale 1, opacity 1` | 2.2 | `power2.out` | 0 |
| `[data-brand]` | `opacity 0, y -14` → `opacity 1, y 0` | 1 | default | 0.4 |
| `[data-rail-label]` | `opacity 0, y 24` → `opacity 1, y 0` | 1 | default | 0.5 |
| `[data-rail-line]` | `scaleY 0` → `scaleY 1` | 1.4 | `power2.inOut` | 0.5 |
| `[data-headline]` | `yPercent 115` → `yPercent 0` | 1.3, stagger 0.12 | default | 0.6 |
| `[data-fade]` | `opacity 0, y 26` → `opacity 1, y 0` | 1, stagger 0.14 | default | 1.15 |
| `[data-rule]` | `scaleX 0` → `scaleX 1` | 0.9 | `power2.inOut` | 1.3 |
| `[data-rail-diamond]` | `opacity 0, scale 0` → `opacity 1, scale 1` | 0.5 | `back.out(2)` | 1.5 |
| `[data-divider]` | `opacity 0` → `opacity 1` | 1.2 | default | 1.9 |

### 8.2 Scroll parallax

Two scrubbed tweens, both triggered on the section with
`start: 'top top'`, `end: 'bottom top'`, `scrub: true`, `ease: 'none'`:

- `scene` → `yPercent: 12, scale: 1.06`
- `copy` → `yPercent: -14, opacity: 0.25`

### 8.3 Pointer parallax

`gsap.quickTo` setters, then feed them from `trackPointer`:

| Target | Property | Value | Duration | Ease |
| --- | --- | --- | --- | --- |
| `scene` | `x` | `x * -22` | 1.1 | `power3.out` |
| `scene` | `y` | `y * -14` | 1.1 | `power3.out` |
| `copy` | `x` | `x * 8` | 1.4 | `power3.out` |

Return `untrack` from the context callback so the listener is removed.

---

## 9. `CursorLens` — the black-and-white reveal

A soft circular region that trails the cursor and reveals the B&W frame,
registered pixel-for-pixel with the colour frame beneath it. It must read as
colour draining out of the scene, not as a window sitting on top of it.

```jsx
<CursorLens sceneRef={scene} src={BNW_WEBP} fallback={BNW_JPG} />
```

Rendered **inside** the scene transform group, as a sibling of the colour
`<picture>`.

### Constants

```js
const LENS_SIZE = 460

const FEATHER =
  'radial-gradient(circle at center, #000 0%, rgba(0,0,0,0.96) 22%, ' +
  'rgba(0,0,0,0.78) 40%, rgba(0,0,0,0.45) 58%, rgba(0,0,0,0.16) 74%, ' +
  'transparent 88%)'
```

### Markup

A `div[aria-hidden]` with inline
`{ width: LENS_SIZE, height: LENS_SIZE, WebkitMaskImage: FEATHER, maskImage: FEATHER }`
and classes `pointer-events-none absolute top-0 left-0 overflow-hidden opacity-0`.
No border, no shadow, no `rounded-*`.

Inside: `<picture><source srcSet={src} type="image/webp" /><img ref … src={fallback}
alt="" fetchPriority="low" decoding="async" className="absolute top-0 left-0
max-w-none object-cover object-[30%_50%] lg:object-center" /></picture>`.

`max-w-none` is required — Tailwind's preflight sets `img { max-width: 100% }`,
which would otherwise clamp the inner copy to the lens instead of the scene.

### Gating

`const [active, setActive] = useState(false)`. A mount effect sets it true only
when `!prefersReducedMotion()` **and** `matchMedia('(hover: hover)').matches`.
`if (!active) return null` before the markup, so the second image is never
requested on phones or under reduced motion.

### Wiring effect

Runs when `active`. Use **`useEffect`, not `useLayoutEffect`** — layout effects
run child-before-parent, so `sceneRef.current` is still null in a layout effect
and the whole thing silently no-ops.

```js
const scene = sceneRef.current, frame = lens.current, img = image.current
const clip = scene.parentElement
```

- `syncSize()` sets `img.style.width/height` to `scene.offsetWidth/offsetHeight`
  — the inner copy is sized to the *scene*, not the lens. Call on mount and on
  `resize`.
- `gsap.set(frame, { opacity: 0, scale: 0.88 })`
- State: `{ x, y, tx, ty, seen, inside }`. `tx/ty` hold **viewport**
  coordinates.
- `show(inside)` — early-returns if unchanged, else tweens
  `opacity: inside ? 1 : 0`, `scale: inside ? 1 : 0.88`,
  `duration: inside ? 0.6 : 0.4`, ease `power3.out` in / `power2.in` out.
- `pointermove` on `window` (passive) records `tx/ty`, seeds `x/y` on the first
  event, and calls `show()` with a hit-test of the cursor against
  `clip.getBoundingClientRect()`.
- `pointerleave` on `document` → `show(false)`.
- `scroll` on `window` (passive) re-runs the same hit-test with the last known
  cursor position — scrolling moves the hero out from under a stationary
  cursor.
- A `gsap.ticker` callback:

```js
state.x += (state.tx - state.x) * 0.16
state.y += (state.ty - state.y) * 0.16

const rect = scene.getBoundingClientRect()
const sx = rect.width / scene.offsetWidth
const sy = rect.height / scene.offsetHeight

const left = (state.x - rect.left) / sx - LENS_SIZE / 2
const top  = (state.y - rect.top)  / sy - LENS_SIZE / 2

gsap.set(frame, { x: left, y: top })
gsap.set(img,   { x: -left, y: -top })
```

Clean up the ticker callback and all four listeners on unmount.

---

## 10. Invariants

Each of these was a real failure. Changing any one visibly breaks the page.

1. **The scene clip is `z-0`, never `-z-10`.** A negative index puts it behind
   the section's own `bg-ink` and the hero renders solid black.
2. **Neither image may carry a Tailwind `scale-*` class.** CSS applies the
   `scale` property *after* `transform`, so it multiplies GSAP's translations on
   one image but not the other and the two frames slide apart as the cursor
   moves. Overscan comes from `-inset-6` on the group instead.
3. **The lens lives inside the scene transform group.** Outside it, pointer
   parallax pulls the frames apart by up to 22px — a visible seam.
4. **The inner copy translates by exactly the negative of the lens position.**
   That is the whole registration mechanism.
5. **Convert viewport → scene coordinates inside the ticker, not on
   pointermove.** Dividing out the scene's current scale each frame is what
   keeps the lens from falling behind the parallax between pointer events.
6. **`CursorLens` uses `useEffect`.** See §9.
7. **The lens mask keeps its intermediate alpha stops.** Collapsing them to
   `#000 0%, transparent 100%` brings a visible disc back.

---

## 11. Accessibility

- Everything decorative (`SideRail`, `Divider`, `CursorLens`, the CTA star, the
  grain and scrim layers) is `aria-hidden="true"`.
- The hero image carries real descriptive alt text; the lens copy is `alt=""`.
- Both interactive elements (CTA, scroll cue) have visible bone focus rings at
  `outline-offset-4`.
- Under `prefers-reduced-motion`: no load timeline, no parallax, no lens, no
  scroll-tick animation, and `.reveal` elements are forced visible.

---

## 12. Acceptance criteria

Measurable, in order of how likely they are to catch a mistake:

1. **Registration.** With the cursor held over the red foreground grass, the
   grass blades run unbroken across the lens boundary. Sample mean saturation
   `(max−min)/max` along a horizontal line from the lens centre outwards: it
   should ramp roughly `0.00 → 0.06 → 0.17 → 0.36 → 0.53 → 0.80` over ~240px,
   with no step anywhere. A step means a broken invariant in §10.
2. **No visible lens shape.** No straight edge, corner, border or shadow at any
   cursor position.
3. **Payload.** A desktop load requests exactly two images, 100–130KB each. A
   reduced-motion or touch load requests exactly one.
4. **Hero not black.** The artwork is visible on first paint; the samurai,
   horse and maple all read clearly against the scrims.
5. **Mobile legibility.** At 390–500px wide, the body copy is comfortably
   readable against the scene.
6. **Reduced motion.** With the preference set, all copy is visible and static,
   and no lens exists in the DOM.
7. `npm run build` and `npm run lint` are clean, and the console has no errors.

---

## Asset hosting

The art lives on Cloudinary: two full-quality PNG masters, with every delivered
format derived from them on request. Read is public — the hero has to render
for every visitor — and writes are signed with an API secret that never leaves
the maintainer's machine.

`ASSETS.md` in this repo is the runbook: account, credentials, upload script,
and the two security steps that matter (no unsigned upload presets; strict
transformations). It also has the checks that prove writes are closed.

The cloud name is `g05cmote`; it is baked into the URLs in §0 and is not a
secret. Nothing else about the account is needed to build this page.

Because the derivations are addressed by transformation rather than by content
hash, **re-uploading a master changes what those same URLs return.** The upload
script sends `invalidate=true` so the CDN copies are purged, but anything that
cached a derived file locally will keep the old bytes until it re-fetches.
`DRY_RUN=1 ./scripts/upload-assets.sh` shows what would go up without touching
the account.
