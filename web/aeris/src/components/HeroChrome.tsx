import type { Viewport } from '../lib/viewport'

type Props = { viewport: Viewport }

const NAV = ['System', 'Filtration', 'Index'] as const

/** Fictional, but the shape of a real spec sheet — label left, value right. */
const SPEC: readonly (readonly [string, string])[] = [
  ['Filtration', 'P3 · 99.95%'],
  ['Cartridge', '400 H'],
  ['Draw', 'Sealed'],
  ['Mass', '214 G'],
  ['Telemetry', 'None'],
]

/**
 * The chrome is drawn in white and composited with `difference`, so it resolves
 * to black over the white ground and to white where it crosses the subject's
 * black garment. Positioning alone can't solve that: the frames are full-bleed
 * and the subject moves under the cursor, so anything pinned to a corner will
 * sooner or later sit on top of him.
 */
const INK = '#fff'
const RULE = 'rgba(255,255,255,0.3)'

/**
 * Everything drawn over the frame stage.
 *
 * Deliberately instrument-like rather than editorial: one monospace face,
 * uppercase at small sizes, hairline rules, and a registration frame with
 * corner ticks. Pure layout — it reads the viewport only to collapse the
 * desktop corners into a stacked column, and never touches the scrub.
 */
export default function HeroChrome({ viewport }: Props) {
  const compact = !viewport.isDesktop
  const edge = compact ? 16 : 28
  const inset = compact ? 10 : 20

  const label: React.CSSProperties = {
    fontSize: compact ? 8.5 : 9.5,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    opacity: 0.45,
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10,
        pointerEvents: 'none',
        color: INK,
        mixBlendMode: 'difference',
        fontFamily: "'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace",
        fontWeight: 400,
      }}
    >
      {/* Registration frame — a hairline box with ticks at the corners, so the
          page reads as an instrument window onto the subject. */}
      <div style={{ position: 'absolute', inset, border: `1px solid ${RULE}` }} />
      {([
        [inset - 3, inset - 3],
        ['auto', inset - 3],
        [inset - 3, 'auto'],
        ['auto', 'auto'],
      ] as const).map(([left, top], i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: 6,
            height: 6,
            background: INK,
            left: left === 'auto' ? undefined : left,
            right: left === 'auto' ? inset - 3 : undefined,
            top: top === 'auto' ? undefined : top,
            bottom: top === 'auto' ? inset - 3 : undefined,
          }}
        />
      ))}

      {/* Identity */}
      <div style={{ position: 'absolute', top: edge + inset, left: edge + inset }}>
        <div
          style={{
            fontSize: compact ? 17 : 21,
            fontWeight: 600,
            letterSpacing: '0.34em',
            textTransform: 'uppercase',
          }}
        >
          Aeris
        </div>
        <div style={{ ...label, marginTop: 7 }}>Atmospheric Systems</div>
      </div>

      {/* Nav + live marker */}
      {!compact && (
        <nav
          style={{
            position: 'absolute',
            top: edge + inset + 4,
            right: edge + inset,
            display: 'flex',
            alignItems: 'center',
            gap: 26,
            fontSize: 9.5,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}
        >
          {NAV.map((item) => (
            <span key={item}>{item}</span>
          ))}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              borderLeft: `1px solid ${RULE}`,
              paddingLeft: 20,
            }}
          >
            <span
              style={{ width: 5, height: 5, borderRadius: '50%', background: INK }}
            />
            Reserve
          </span>
        </nav>
      )}

      {/* Spec sheet */}
      <div
        style={{
          position: 'absolute',
          left: edge + inset,
          top: compact ? edge + inset + 78 : '50%',
          transform: compact ? undefined : 'translateY(-50%)',
          width: compact ? 190 : 232,
          borderTop: `1px solid ${RULE}`,
        }}
      >
        {SPEC.map(([k, v]) => (
          <div
            key={k}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              padding: compact ? '6px 0' : '8px 0',
              borderBottom: `1px solid ${RULE}`,
              fontSize: compact ? 8.5 : 9.5,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            <span style={{ opacity: 0.45 }}>{k}</span>
            <span style={{ fontWeight: 500 }}>{v}</span>
          </div>
        ))}
      </div>

      {/* The only instruction the page gives */}
      {!compact && (
        <div
          style={{
            position: 'absolute',
            left: edge + inset,
            bottom: edge + inset,
            ...label,
            opacity: 0.4,
          }}
        >
          ←&nbsp;&nbsp;Move across the frame&nbsp;&nbsp;→
        </div>
      )}

      {/* Product line */}
      <div
        style={{
          position: 'absolute',
          right: edge + inset,
          bottom: edge + inset,
          textAlign: 'right',
        }}
      >
        <div style={{ ...label, marginBottom: 9 }}>Unit 01 / Matte Carbon</div>
        <div
          style={{
            fontSize: compact ? 19 : 25,
            fontWeight: 500,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}
        >
          Aeris One
        </div>
        <div
          style={{
            marginTop: 13,
            paddingTop: 11,
            borderTop: `1px solid ${RULE}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 16,
            fontSize: compact ? 10 : 11,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          <span style={{ opacity: 0.45 }}>USD</span>
          <span style={{ fontWeight: 600, fontSize: compact ? 14 : 16 }}>312.00</span>
          <span style={{ border: `1px solid ${INK}`, padding: '7px 15px', fontWeight: 500 }}>
            Reserve
          </span>
        </div>
      </div>
    </div>
  )
}
