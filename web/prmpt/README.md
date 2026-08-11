# prmpt

A scroll-driven fashion archive. Two phases: a full-bleed video hero where the
cursor scrubs the footage instead of playing it, and a black panel that rides up
over it carrying a scattered gallery, ending on a white outro.

```bash
npm run dev --workspace=prmpt
# or
npx turbo run dev --filter=prmpt
```

Built from an external spec (a MotionSites-style prompt), so this workspace
doubles as a fidelity test — see **Deviations** for everywhere the spec was
ambiguous, self-contradictory, or wrong.

## How the scroll works

There are three coordinate systems and it's worth being precise about which
owns what, because two of them write to the same CSS property.

**Phase 1 — panel ride-up (scroll 0 → vh).** The only piece handed to GSAP.
A single `ScrollTrigger` with `scrub: true` drives the panel from
`translateY(100vh)` to `0`.

**Phase 2 — gallery travel (scroll > vh).** The panel is now fixed at the top
and the inner wrapper translates up by `-(scrollY - vh)`, dragging the grid
through the viewport.

**Outro (scroll > vh + maxScroll).** White overlay fades in, the price block
lifts by its `data-outro-offset`, the pill scales from 0, the footer appears.

Everything except the ride-up runs in **one `requestAnimationFrame` loop** in
`App.tsx` — no scroll listeners. Card scale is derived from each card's measured
`getBoundingClientRect()` rather than from scroll arithmetic, which matters:
it stays correct regardless of where ScrollTrigger happens to have left the
panel mid-frame, so the two systems can't drift apart.

Page height is `vh + maxScroll + 2 * vh`, where `maxScroll` comes from a
`ResizeObserver` on the wrapper — so it re-derives itself when the column count
changes at a breakpoint.

### The transform ownership rule

GSAP owns `transform` on the panel. The RAF loop owns `transform` on the
wrapper and every card. **React must never write `transform` inline on those
nodes** — inline styles beat a stylesheet, so a re-render (a resize crossing a
breakpoint, say) would silently stomp whatever the animation had set and the
panel would snap back off-screen until the next scroll event corrected it.

Initial transforms therefore live in `index.css` as `.bp-panel` and `.bp-card`
rules, never in JSX. Keep it that way.

## The cursor-scrubbed video

Two clips share one box. Cursor distance from centre maps to `currentTime`;
crossing the centre swaps which clip is visible. A dead zone of
`max(30, width * 0.05)` around the middle parks both at frame 0 so small
movements near centre don't strobe.

The non-obvious part is the seek guard:

```ts
if (!current.seeking && Number.isFinite(duration) && duration > 0) {
  current.currentTime = progress * duration
}
```

Without the `!seeking` check every frame cancels the previous frame's decode and
the video judders instead of scrubbing. Pointer position is sampled on
`mousemove` but only *applied* on the frame tick, so a fast mouse can't queue
more seeks than the decoder can service.

Touch devices have no cursor to scrub with, so the clips just alternate on
`ended`, and honour `prefers-reduced-motion`.

## Everything is `mix-blend-mode: exclusion`

All fixed chrome uses it, which is what lets one set of white text stay legible
over both the near-white video and the black panel without a single colour
change. Two consequences that look like bugs and aren't:

- The **"view" pill renders black.** Spec says `background: #fff` *and*
  `mix-blend-mode: exclusion`; over the white outro overlay, exclusion of white
  against white resolves to black. The label is white with its own exclusion, so
  it inverts back to white against the now-black pill. Faithful, and it looks
  deliberate.
- Chrome stays visible **over** the gallery images during phase 2. The spec
  never fades it, so neither do we.

## Deviations from the source spec

| Spec said | What's here | Why |
| --- | --- | --- |
| Caption copy about video dead zones | Brand copy | The spec's caption text was a paragraph of **prompt engineering instructions** that leaked into the copy deck. Original preserved in a comment in `HeroChrome.tsx`. |
| Logo: filled paths, viewBox `0 0 355 110` | Inter Tight `<text>` at the same metrics | No path data was supplied. Swap in real outlines when a brand file exists. |
| Cursor: "custom Japanese/decorative glyph path" | Stand-in mark at matching optical weight | Same — no path data supplied. |
| Vite 6 | Vite 8 | Matches the rest of the monorepo so one Vite version hoists. |
| Grid gap unspecified | `12px`, wrapper padding `16px` | Not stated anywhere in the spec. |

Unresolved in the spec, decided here: it calls for the panel to slide via
GSAP ScrollTrigger *and* declares the page "entirely RAF-driven position
tracking." Both are implemented, split along the boundary described above.

## Assets

Every remote URL is centralised in `src/assets.ts`. **None of it is ours** —
the two videos sit on a third-party CloudFront bucket and the ten stills are
proxied through `images.higgs.ai`. There is no hotlink protection on either, and
no pinning: the day a bucket is pruned or a key rotates, this page goes blank.

Self-hosting should mean editing that one file and nothing else.
