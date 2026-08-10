import { useEffect, useRef } from 'react'

/**
 * Desktop-only pointer mark — a thin crosshair, to match the registration
 * framing rather than the soft disc a fashion page would use.
 *
 * Position is written straight to the node rather than held in state: this
 * fires on every mousemove and must not re-render the tree.
 * `mix-blend-mode: difference` keeps it readable over both the white ground
 * and the black garment.
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
        mixBlendMode: 'difference',
      }}
    >
      <svg width="54" height="54" viewBox="0 0 54 54" fill="none">
        {/* Arms broken at the centre so the mark never sits on top of what it
            is pointing at. */}
        <path
          d="M27 3V19M27 35V51M3 27H19M35 27H51"
          stroke="#fff"
          strokeWidth="1"
          strokeLinecap="square"
        />
        <rect x="21.5" y="21.5" width="11" height="11" stroke="#fff" strokeWidth="1" />
      </svg>
    </div>
  )
}
