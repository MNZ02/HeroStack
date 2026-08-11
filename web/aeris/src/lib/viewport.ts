import { useEffect, useState } from 'react'

/**
 * Duplicated from `web/prmpt` rather than shared. Two studies now want it,
 * which is the bar `packages/` exists for — but lifting it means editing prmpt
 * too, so it stays local until something else forces the move.
 */
export type Viewport = {
  width: number
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  /** No hover-capable pointer — there is no cursor to scrub with. */
  isTouch: boolean
}

const read = (): Viewport => {
  const width = typeof window === 'undefined' ? 1440 : window.innerWidth
  return {
    width,
    isMobile: width < 640,
    isTablet: width >= 640 && width < 1024,
    isDesktop: width >= 1024,
    isTouch:
      typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches,
  }
}

export function useViewport(): Viewport {
  const [viewport, setViewport] = useState(read)

  useEffect(() => {
    let frame = 0
    const onResize = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setViewport(read()))
    }
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return viewport
}
