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
 *
 * Touch gets its own driver. There is no cursor to read, so a horizontal drag
 * feeds the same dead-zone mapping, and between drags the stage sweeps the
 * turn on its own — a slow sine out to each side — so the page never reads as
 * a still. The sweep is self-directed motion, which is exactly what reduced
 * motion asks us not to invent; the drag stays either way, because that only
 * ever moves because the reader moved.
 */
export default function FrameStage({ viewport }: Props) {
  const stage = useRef<HTMLDivElement>(null)
  const nodes = useRef<(HTMLImageElement | null)[]>([])
  const [ready, setReady] = useState(false)

  const scrub = viewport.isDesktop && !viewport.isTouch

  // The whole sequence ships anywhere there is an input to address it with —
  // the cursor on desktop, the finger everywhere else. A narrow desktop
  // window keeps the neutral pose alone; thirty files for a static page is
  // weight without payoff. Memoised because it keys the preload effect below
  // — a fresh array each render would restart the loading pass on every
  // re-render.
  const sources = useMemo(
    () => (scrub || viewport.isTouch ? FRAMES : FRAMES.slice(0, 1)),
    [scrub, viewport.isTouch],
  )

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
    if (!scrub && !viewport.isTouch) return

    // Both drivers paint through the same mapping: an x position becomes an
    // offset from centre, the dead zone keeps the neutral pose under a still
    // input, and `facing` only changes outside it so the mirror never flips
    // mid-hold — crossing the centre happens on frame 0, where the two
    // directions are all but identical.
    let pointerX = window.innerWidth / 2
    let facing: 'left' | 'right' = 'left'
    let shown = 0
    let mirrored: boolean | null = null
    let frame = 0

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // The self-directed sweep: a sine wide enough to reach both ends of the
    // turn, slow enough to read as the subject looking about rather than as
    // an animation loop. Phase 0 opens on the neutral pose heading right.
    let phase = 0
    let last = performance.now()
    const SWEEP_HZ = 1 / 9
    const IDLE_DELAY_MS = 3500

    let lastInputAt = -Infinity

    const paint = () => {
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

      if (index !== shown) {
        nodes.current[shown]?.style.setProperty('opacity', '0')
        nodes.current[index]?.style.setProperty('opacity', '1')
        shown = index
      }

      // The frames as shot turn the subject towards screen-right, so that is
      // the direction that needs no mirror; an input left of centre is the
      // one that gets flipped.
      const flip = facing === 'left'
      if (flip !== mirrored) {
        if (stage.current) {
          stage.current.style.transform = flip ? 'scaleX(-1)' : 'none'
        }
        mirrored = flip
      }
    }

    if (scrub) {
      const onMove = (event: MouseEvent) => {
        pointerX = event.clientX
      }

      const tick = () => {
        frame = requestAnimationFrame(tick)
        paint()
      }

      window.addEventListener('mousemove', onMove, { passive: true })
      frame = requestAnimationFrame(tick)

      return () => {
        cancelAnimationFrame(frame)
        window.removeEventListener('mousemove', onMove)
      }
    }

    // Touch: the drag is sampled per move and applied on a tick, same bargain
    // as the cursor. The page is exactly one screen tall and does not scroll,
    // so a horizontal drag costs nothing and stays passive.
    const onDrag = (event: TouchEvent) => {
      lastInputAt = performance.now()
      pointerX = event.touches[0]?.clientX ?? pointerX
    }

    // The sweep advances on wall-clock delta whether or not it is the thing
    // driving, so a drag that pauses it resumes at the phase it left — never
    // a jump.
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick)
      if (now - lastInputAt > IDLE_DELAY_MS && !reduced) {
        phase += ((now - last) / 1000) * SWEEP_HZ * Math.PI * 2
        const amplitude = (window.innerWidth / 2) * 1.2
        pointerX = window.innerWidth / 2 + Math.sin(phase) * amplitude
      }
      last = now
      paint()
    }

    window.addEventListener('touchstart', onDrag, { passive: true })
    window.addEventListener('touchmove', onDrag, { passive: true })
    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('touchstart', onDrag)
      window.removeEventListener('touchmove', onDrag)
    }
  }, [scrub, viewport.isTouch])

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
