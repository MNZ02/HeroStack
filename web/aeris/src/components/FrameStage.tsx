import { useEffect, useMemo, useRef, useState } from 'react'
import { FRAMES } from '../assets'
import type { Viewport } from '../lib/viewport'

type Props = { viewport: Viewport }

/**
 * The head turn, addressed by frame instead of played.
 *
 * Every frame is its own <img>, stacked and held at opacity 0 except the one
 * the cursor selects. Swapping opacity on two nodes is the whole update, so a
 * frame change costs nothing and can never tear.
 *
 * This is a deliberate move away from scrubbing a <video>. The source clip
 * carries a single keyframe across 121 frames, so seeking to an arbitrary time
 * means decoding from the start — measured at ~120ms per seek even fully
 * buffered, which caps the scrub near 8fps however often you ask for it.
 * Frames have no such cost: the index is a plain array lookup.
 *
 * Only one direction of footage ships. The subject is near-symmetric on a flat
 * ground, so the opposite turn is these same frames under `scaleX(-1)`.
 *
 * Which way the frames already face is a property of the footage, not of the
 * maths — check a late frame before trusting it. The current set turns towards
 * screen-right.
 */
export default function FrameStage({ viewport }: Props) {
  const stage = useRef<HTMLDivElement>(null)
  const nodes = useRef<(HTMLImageElement | null)[]>([])
  const [ready, setReady] = useState(false)

  const scrub = viewport.isDesktop && !viewport.isTouch

  // Only the scrub needs the whole sequence; without a cursor the page shows
  // the neutral pose alone and there is no reason to pull thirty files.
  // Memoised because it keys the preload effect below — a fresh array each
  // render would restart the loading pass on every re-render.
  const sources = useMemo(() => (scrub ? FRAMES : FRAMES.slice(0, 1)), [scrub])

  // Hold the stage hidden until every frame is decoded and ready to paint.
  //
  // `onload` is not sufficient, and neither is warming the cache through
  // `new Image()` — both only promise the bytes arrived. Measured on a cold
  // load, all thirty elements reported `complete` while twenty-nine of them
  // still owed a decode, so the first sweep of the cursor was decoding each
  // frame at the moment it was revealed. That was the flicker.
  //
  // `decode()` resolves once a paintable bitmap exists, and it is called on the
  // elements that actually paint rather than on detached copies of them.
  useEffect(() => {
    let live = true

    const els = nodes.current
      .slice(0, sources.length)
      .filter((node): node is HTMLImageElement => node !== null)

    // Never leave the stage invisible on a decode that rejects or on a browser
    // that hands back no elements — a flicker beats a blank page.
    Promise.all(els.map((el) => el.decode().catch(() => undefined))).then(() => {
      if (live) setReady(true)
    })

    return () => {
      live = false
    }
  }, [sources])

  useEffect(() => {
    if (!scrub) return

    // Pointer position is sampled on move and applied on a frame tick, so a
    // fast mouse can't queue up more work than one paint can absorb.
    let pointerX = window.innerWidth / 2
    let facing: 'left' | 'right' = 'left'
    let shown = 0
    let mirrored: boolean | null = null
    let frame = 0

    const onMove = (event: MouseEvent) => {
      pointerX = event.clientX
    }

    const tick = () => {
      frame = requestAnimationFrame(tick)

      const width = window.innerWidth
      const centre = width / 2
      const dead = Math.max(30, width * 0.05)
      const offset = pointerX - centre

      let index = 0
      if (Math.abs(offset) > dead) {
        facing = offset < 0 ? 'left' : 'right'
        const travel = Math.max(1, centre - dead)
        const progress = Math.min(1, (Math.abs(offset) - dead) / travel)
        index = Math.round(progress * (FRAMES.length - 1))
      }
      // Inside the dead zone the sequence holds on frame 0 and `facing` keeps
      // its last value — so the mirror doesn't flip under a cursor that is
      // sitting still, and crossing the centre happens on the neutral pose,
      // where the two directions are all but identical.

      if (index !== shown) {
        nodes.current[shown]?.style.setProperty('opacity', '0')
        nodes.current[index]?.style.setProperty('opacity', '1')
        shown = index
      }

      // The frames as shot turn the subject towards screen-right, so that is
      // the direction that needs no mirror; a cursor left of centre is the one
      // that gets flipped.
      const flip = facing === 'left'
      if (flip !== mirrored) {
        if (stage.current) {
          stage.current.style.transform = flip ? 'scaleX(-1)' : 'none'
        }
        mirrored = flip
      }
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('mousemove', onMove)
    }
  }, [scrub])

  return (
    <div
      ref={stage}
      id="frame-stage"
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        opacity: ready ? 1 : 0,
        transition: 'opacity 0.4s ease',
        willChange: 'transform',
      }}
    >
      {sources.map((src, i) => (
        <img
          key={src}
          ref={(node) => {
            nodes.current[i] = node
          }}
          src={src}
          alt=""
          decoding="async"
          draggable={false}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            // Frame 0 is the resting pose, so it is the one that starts lit.
            opacity: i === 0 ? 1 : 0,
          }}
        />
      ))}
    </div>
  )
}
