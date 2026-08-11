import { motion } from 'motion/react'
import Logo from './Logo'
import type { Viewport } from '../lib/viewport'

const EASE = [0.25, 0.1, 0.25, 1] as const

/**
 * The spec's caption slot contained a paragraph of prompt instructions about
 * video dead zones — authoring notes that leaked into the copy deck. Replaced
 * with brand copy; the original string is preserved below so the substitution
 * is reversible.
 *
 * Original: "When switching between videos near the center, do not reset
 * currentTime to 0 abruptly. Add a small dead zone: …"
 */
const CAPTION =
  'An archive of garments held between seasons. Each piece is catalogued once, ' +
  'photographed once, and released in a single run. Move across the frame to ' +
  'read the collection.'

const entry = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: EASE, delay },
})

const fixed: React.CSSProperties = {
  position: 'fixed',
  zIndex: 20,
  pointerEvents: 'none',
  mixBlendMode: 'exclusion',
  color: '#fff',
  fontFamily: "'Inter Tight', sans-serif",
  fontWeight: 500,
}

export default function HeroChrome({ viewport }: { viewport: Viewport }) {
  const { isMobile, isTablet, isDesktop } = viewport

  const logoWidth = isMobile ? 124 : isTablet ? 266 : 355
  const edge = isDesktop ? 32 : 16
  const outroOffset = isDesktop ? 166 : 132

  return (
    <>
      <motion.div {...entry(0)} style={{ ...fixed, top: edge, left: edge }}>
        <Logo width={logoWidth} />
      </motion.div>

      <motion.p
        {...entry(0.3)}
        style={{
          ...fixed,
          left: edge,
          top: isDesktop ? 244 : isTablet ? 180 : 118,
          width: isDesktop
            ? 692
            : isTablet
              ? 'calc(50vw - 48px)'
              : 'calc(100vw - 32px)',
          fontSize: 12,
          lineHeight: '140%',
          letterSpacing: '-0.04em',
        }}
      >
        {CAPTION}
      </motion.p>

      <motion.div
        {...entry(0.15)}
        style={{
          ...fixed,
          top: edge,
          right: edge,
          width: isDesktop ? 330 : 'auto',
          height: 30,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {!isMobile && (
          <span style={{ fontSize: 15, textTransform: 'uppercase' }}>About</span>
        )}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: isDesktop ? 50 : 20,
          }}
        >
          <svg
            width={isDesktop ? 30 : 24}
            height={isDesktop ? 30 : 24}
            viewBox="0 0 40 40"
            fill="none"
            aria-hidden="true"
          >
            <path d="M0 14H40" stroke="#fff" strokeWidth="2.5" />
            <path d="M0 26H40" stroke="#fff" strokeWidth="2.5" />
          </svg>
          <span style={{ fontSize: isDesktop ? 15 : 13 }}>[ CART ]</span>
        </div>
      </motion.div>

      <motion.div
        id="outro-info"
        data-outro-offset={outroOffset}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE, delay: 0.45 }}
        style={{
          ...fixed,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          ...(isDesktop
            ? { right: 32, bottom: 80, width: 330 }
            : { left: 0, right: 0, bottom: 48 }),
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            width: isDesktop ? '100%' : 252,
            marginBottom: isDesktop ? 32 : 12,
          }}
        >
          <div
            style={{
              position: 'relative',
              width: isDesktop ? 30 : 20,
              height: isDesktop ? 30 : 20,
            }}
          >
            <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none">
              <circle
                cx="20"
                cy="20"
                r="18.75"
                stroke="#fff"
                strokeWidth={isDesktop ? 2.5 : 2}
              />
            </svg>
            <span
              id="circle-symbol"
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isDesktop ? 15 : 10,
                letterSpacing: '-0.04em',
                textTransform: 'uppercase',
              }}
            >
              8
            </span>
          </div>
          <span
            style={{
              fontSize: isDesktop ? 30 : 20,
              lineHeight: '100%',
              textAlign: 'center',
              letterSpacing: '-0.04em',
              textTransform: 'uppercase',
            }}
          >
            Archive Collection
            <br />
            &ldquo;prompt&rdquo;
          </span>
        </div>
        <span
          style={{
            fontSize: isDesktop ? 80 : 60,
            lineHeight: '100%',
            textAlign: 'center',
            letterSpacing: '-0.04em',
          }}
        >
          $97,33
        </span>
      </motion.div>

      {/* White pill, white label — exclusion resolves the text to black against
          its own background, so one colour value covers both states. */}
      <div
        id="outro-buy"
        style={{
          ...fixed,
          background: '#fff',
          borderRadius: 1335,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transformOrigin: 'right bottom',
          transform: 'scale(0)',
          ...(isDesktop
            ? { right: 32, bottom: 32, width: 330, height: 174 }
            : { left: 16, right: 16, bottom: 60, height: 100 }),
        }}
      >
        <span
          style={{
            fontSize: isDesktop ? 110 : 72,
            letterSpacing: '-0.04em',
            color: '#fff',
            mixBlendMode: 'exclusion',
            lineHeight: 1,
          }}
        >
          view
        </span>
      </div>

      <div
        id="outro-overlay"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 12,
          pointerEvents: 'none',
          background: '#fff',
          opacity: 0,
        }}
      />

      <div
        id="outro-footer"
        style={{
          ...fixed,
          left: 16,
          right: isMobile ? 16 : undefined,
          bottom: isDesktop ? 32 : 24,
          opacity: 0,
          display: 'flex',
          flexDirection: 'row',
          gap: isDesktop ? 80 : undefined,
          justifyContent: isMobile ? 'space-between' : undefined,
          fontSize: isDesktop ? 13 : 11,
          letterSpacing: '-0.02em',
          textTransform: 'uppercase',
        }}
      >
        <span>prmpt (R) 2026</span>
        <span>Privacy Policy</span>
      </div>
    </>
  )
}
