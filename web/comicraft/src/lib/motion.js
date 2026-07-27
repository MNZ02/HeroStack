import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/** The user asked the OS not to animate — we honour that everywhere. */
export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Follows the pointer with an eased spring, normalised to [-1, 1] on both
 * axes, and hands the value to `onMove`. Returns a cleanup function.
 * No-ops on coarse pointers (touch) where there is nothing to follow.
 */
export function trackPointer(onMove) {
  if (typeof window === 'undefined') return () => {}
  if (prefersReducedMotion()) return () => {}
  if (window.matchMedia('(pointer: coarse)').matches) return () => {}

  const handle = (event) => {
    const x = (event.clientX / window.innerWidth) * 2 - 1
    const y = (event.clientY / window.innerHeight) * 2 - 1
    onMove(x, y)
  }

  window.addEventListener('pointermove', handle, { passive: true })
  return () => window.removeEventListener('pointermove', handle)
}

export { gsap, ScrollTrigger }
