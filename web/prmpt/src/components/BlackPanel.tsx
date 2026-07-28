import { type RefObject, useMemo } from 'react'
import { GALLERY } from '../assets'
import { buildLayout, columnsFor } from '../lib/layout'

type Props = {
  panelRef: RefObject<HTMLDivElement | null>
  wrapRef: RefObject<HTMLDivElement | null>
  width: number
}

/**
 * The panel that rides up over the video and carries the gallery.
 *
 * Cards start at `scale(0)` and are driven entirely from the scroll loop in
 * `App` — nothing here animates on its own. Origin is set toward the nearest
 * screen edge so images grow outward from the margin rather than from centre.
 */
export default function BlackPanel({ panelRef, wrapRef, width }: Props) {
  const cols = columnsFor(width)
  const rows = useMemo(() => buildLayout(GALLERY.length, cols), [cols])

  return (
    <div
      ref={panelRef}
      className="bp-panel"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10,
        background: '#000',
        willChange: 'transform',
      }}
    >
      <div
        ref={wrapRef}
        style={{
          width: '100%',
          paddingTop: 'min(400px, 40vh)',
          paddingLeft: 16,
          paddingRight: 16,
          willChange: 'transform',
        }}
      >
        {rows.map((row, r) => (
          <div
            key={r}
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gap: 12,
              marginBottom: 12,
            }}
          >
            {row.map((index, c) =>
              index === -1 ? (
                <div key={c} style={{ aspectRatio: '2 / 3' }} />
              ) : (
                <div
                  key={c}
                  className="bp-card"
                  style={{
                    aspectRatio: '2 / 3',
                    transformOrigin:
                      c < cols / 2 ? 'right bottom' : 'left bottom',
                  }}
                >
                  <img
                    src={GALLERY[index]}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                </div>
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
