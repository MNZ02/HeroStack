import { useEffect, useRef, useState } from 'react'
import { VIDEO_LEFT, VIDEO_RIGHT } from '../assets'
import { prefersReducedMotion, type Viewport } from '../lib/viewport'

type Props = { viewport: Viewport }

/**
 * Two clips stacked in one box, driven by the cursor rather than by playback.
 *
 * Moving away from the centre of the screen scrubs one clip forward in
 * proportion to how far out you are; crossing the centre swaps to the other.
 * A dead zone around the middle keeps both parked at frame zero so small
 * movements near centre don't strobe between the two.
 *
 * On touch there is no cursor to scrub with, so the clips simply alternate.
 */
export default function VideoStage({ viewport }: Props) {
  const left = useRef<HTMLVideoElement>(null)
  const right = useRef<HTMLVideoElement>(null)
  const [ready, setReady] = useState(0)

  const scrub = viewport.isDesktop && !viewport.isTouch

  useEffect(() => {
    const a = left.current
    const b = right.current
    if (!a || !b) return

    if (!scrub) {
      // Touch: alternate the two clips, unless the user asked for less motion.
      if (prefersReducedMotion()) return

      a.style.display = 'block'
      b.style.display = 'none'

      const toRight = () => {
        a.style.display = 'none'
        b.style.display = 'block'
        b.currentTime = 0
        void b.play()
      }
      const toLeft = () => {
        b.style.display = 'none'
        a.style.display = 'block'
        a.currentTime = 0
        void a.play()
      }

      a.addEventListener('ended', toRight)
      b.addEventListener('ended', toLeft)
      void a.play()

      return () => {
        a.removeEventListener('ended', toRight)
        b.removeEventListener('ended', toLeft)
      }
    }

    // Desktop: cursor-scrubbed. Pointer position is sampled on move and applied
    // on a frame tick, so a fast mouse can't queue up more seeks than the
    // decoder can service.
    let pointerX = window.innerWidth / 2
    let active: 'left' | 'right' = 'right'
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

      if (Math.abs(offset) <= dead) {
        // Inside the dead zone: hold whichever clip was last shown at frame 0.
        const current = active === 'left' ? a : b
        if (!current.seeking && current.currentTime !== 0) current.currentTime = 0
        return
      }

      active = offset < 0 ? 'right' : 'left'
      const current = active === 'left' ? a : b
      const other = active === 'left' ? b : a

      if (current.style.display !== 'block') {
        current.style.display = 'block'
        other.style.display = 'none'
      }

      const travel = Math.max(1, centre - dead)
      const progress = Math.min(1, (Math.abs(offset) - dead) / travel)

      // Skipping the write while a seek is outstanding is what keeps the
      // scrub smooth — otherwise every frame cancels the last one's decode.
      const duration = current.duration
      if (!current.seeking && Number.isFinite(duration) && duration > 0) {
        current.currentTime = progress * duration
      }
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('mousemove', onMove)
    }
  }, [scrub])

  const fill: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  }

  return (
    <div
      id="main-canvas"
      style={{
        position: 'fixed',
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        opacity: ready >= 2 ? 1 : 0,
        transition: 'opacity 0.3s ease',
        ...(viewport.isDesktop
          ? { inset: 0, width: '100%', height: '100%' }
          : {
              left: 0,
              top: 220,
              width: '100vw',
              height: 'calc(100vh - 220px)',
            }),
      }}
    >
      <video
        ref={left}
        src={VIDEO_LEFT}
        muted
        playsInline
        preload="auto"
        onLoadedData={() => setReady((n) => n + 1)}
        style={{ ...fill, display: 'none' }}
      />
      <video
        ref={right}
        src={VIDEO_RIGHT}
        muted
        playsInline
        preload="auto"
        onLoadedData={() => setReady((n) => n + 1)}
        style={{ ...fill, display: 'block' }}
      />
    </div>
  )
}
