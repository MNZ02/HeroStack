/**
 * The turn, as frames.
 *
 * These are self-hosted under `public/frames/` — cut from a 5s generated clip,
 * trimmed to the window where the head is actually moving, and re-encoded as
 * webp. `ASSETS.md` is the runbook for regenerating them.
 *
 * Only one direction ships. The subject is near-symmetric on a flat white
 * ground, so the opposite turn is these same files under `scaleX(-1)` — see
 * `FrameStage`. That halves both the download and the work to produce it.
 *
 * `BASE_URL` matters: `npm run build:site` builds each study with a `--base` of
 * `/studies/<slug>/`, so a bare `/frames/…` would 404 in the deployed tree.
 */
export const FRAME_COUNT = 30

export const FRAMES: readonly string[] = Array.from(
  { length: FRAME_COUNT },
  (_, i) => `${import.meta.env.BASE_URL}frames/turn_${String(i).padStart(2, '0')}.webp`,
)

/** Frame 0 is the neutral, forward-facing pose both directions rest on. */
export const NEUTRAL = FRAMES[0]
