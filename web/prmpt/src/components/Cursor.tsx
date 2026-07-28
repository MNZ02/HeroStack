import { useEffect, useRef } from 'react'

/**
 * Desktop-only pointer mark. Position is written straight to the node rather
 * than held in state — this runs on every mousemove and must not re-render the
 * tree. `mix-blend-mode: exclusion` keeps it legible over both the video and
 * the black panel.
 */
export default function Cursor() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const onMove = (event: MouseEvent) => {
      node.style.left = `${event.clientX}px`
      node.style.top = `${event.clientY}px`
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{
        position: 'fixed',
        left: -100,
        top: -100,
        zIndex: 50,
        pointerEvents: 'none',
        transform: 'translate(-50%, -50%)',
        mixBlendMode: 'exclusion',
      }}
    >
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="22.75" stroke="#fff" strokeWidth="2.5" />
        {/* Spec calls for a decorative glyph but ships no path data; this is a
            stand-in mark drawn to the same optical weight. */}
        <path
          d="M24 13.5V34.5M15 18.75L33 29.25M33 18.75L15 29.25"
          stroke="#fff"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}
