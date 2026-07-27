import { useEffect, useRef, useState } from 'react'
import { gsap, prefersReducedMotion } from '../lib/motion'

const LENS_SIZE = 460

// A single radial falloff, so the reveal has no straight edge and no corners
// to give away that it is a rectangle. The intermediate alpha stops matter as
// much as the shape: the mask goes fully opaque only in a small core, then
// spends most of its radius partly transparent, which reads as the colour
// draining out of the scene rather than as a window sitting on top of it.
const FEATHER = [
  'radial-gradient(circle at center,',
  '#000 0%,',
  'rgba(0, 0, 0, 0.96) 22%,',
  'rgba(0, 0, 0, 0.78) 40%,',
  'rgba(0, 0, 0, 0.45) 58%,',
  'rgba(0, 0, 0, 0.16) 74%,',
  'transparent 88%)',
].join(' ')

/**
 * A lens that follows the cursor and reveals a second copy of the scene —
 * here the black-and-white frame — perfectly registered with the colour one
 * underneath it.
 *
 * Must be rendered inside `sceneRef`, alongside the colour image, so both
 * copies share the parallax transform and can never drift apart.
 */
export default function CursorLens({ sceneRef, src, fallback }) {
  const lens = useRef(null)
  const image = useRef(null)

  // Nothing is rendered until we know the lens can actually run, so the second
  // copy of the scene is never downloaded on phones or under reduced motion.
  const [active, setActive] = useState(false)

  useEffect(() => {
    // A cursor effect is meaningless without a cursor, and unwelcome when the
    // user has asked for less motion.
    if (prefersReducedMotion()) return
    if (!window.matchMedia('(hover: hover)').matches) return
    setActive(true)
  }, [])

  // Deliberately a passive effect, not a layout effect: layout effects run
  // child-before-parent, so `sceneRef` is still null at that point.
  useEffect(() => {
    if (!active) return

    const scene = sceneRef.current
    const frame = lens.current
    const img = image.current
    if (!scene || !frame || !img) return

    const clip = scene.parentElement

    // The inner image is a full copy of the scene, so it is sized to the scene
    // box rather than to the lens it peeks through.
    const syncSize = () => {
      img.style.width = `${scene.offsetWidth}px`
      img.style.height = `${scene.offsetHeight}px`
    }
    syncSize()

    gsap.set(frame, { opacity: 0, scale: 0.88 })

    // Tracked in viewport coordinates; converted to scene coordinates at paint
    // time, so the lens can never fall behind the parallax it rides on.
    const state = { x: 0, y: 0, tx: 0, ty: 0, seen: false, inside: false }

    const show = (inside) => {
      if (inside === state.inside) return
      state.inside = inside
      gsap.to(frame, {
        opacity: inside ? 1 : 0,
        scale: inside ? 1 : 0.88,
        duration: inside ? 0.6 : 0.4,
        ease: inside ? 'power3.out' : 'power2.in',
      })
    }

    const onMove = (event) => {
      state.tx = event.clientX
      state.ty = event.clientY

      if (!state.seen) {
        state.x = state.tx
        state.y = state.ty
        state.seen = true
      }

      const box = clip.getBoundingClientRect()
      show(
        event.clientX >= box.left &&
          event.clientX <= box.right &&
          event.clientY >= box.top &&
          event.clientY <= box.bottom,
      )
    }

    const onLeave = () => show(false)

    // Scrolling moves the hero out from under a stationary cursor, so the lens
    // has to reconsider whether it is still over the scene.
    const onScroll = () => {
      if (!state.seen) return
      const box = clip.getBoundingClientRect()
      show(
        state.tx >= box.left &&
          state.tx <= box.right &&
          state.ty >= box.top &&
          state.ty <= box.bottom,
      )
    }

    // Trail the cursor rather than snapping to it.
    const render = () => {
      if (!state.seen) return
      state.x += (state.tx - state.x) * 0.16
      state.y += (state.ty - state.y) * 0.16

      // Undo whatever the parallax has done to the scene, so the lens lands
      // under the cursor in the scene's own untransformed coordinates.
      const rect = scene.getBoundingClientRect()
      const sx = rect.width / scene.offsetWidth
      const sy = rect.height / scene.offsetHeight

      const left = (state.x - rect.left) / sx - LENS_SIZE / 2
      const top = (state.y - rect.top) / sy - LENS_SIZE / 2

      // The inner copy moves opposite the lens by exactly as much, which is
      // what keeps the two frames pixel-aligned.
      gsap.set(frame, { x: left, y: top })
      gsap.set(img, { x: -left, y: -top })
    }

    gsap.ticker.add(render)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', syncSize)
    document.addEventListener('pointerleave', onLeave)

    return () => {
      gsap.ticker.remove(render)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', syncSize)
      document.removeEventListener('pointerleave', onLeave)
    }
  }, [active, sceneRef])

  if (!active) return null

  return (
    <div
      ref={lens}
      aria-hidden="true"
      style={{
        width: LENS_SIZE,
        height: LENS_SIZE,
        WebkitMaskImage: FEATHER,
        maskImage: FEATHER,
      }}
      className="pointer-events-none absolute top-0 left-0 overflow-hidden opacity-0"
    >
      <picture>
        <source srcSet={src} type="image/webp" />
        <img
          ref={image}
          src={fallback}
          alt=""
          fetchPriority="low"
          decoding="async"
          className="absolute top-0 left-0 max-w-none object-cover object-[30%_50%] lg:object-center"
        />
      </picture>
    </div>
  )
}
