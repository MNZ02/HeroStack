import { motion } from 'motion/react'
import { SITE } from '../site'
import { STUDIES } from '../data/studies'

const EASE = [0.25, 0.1, 0.25, 1] as const

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: EASE, delay },
})

/** Numbers pulled from the studies themselves, so the pitch can't drift. */
const STATS = [
  { value: `${STUDIES.length}`, label: 'studies' },
  { value: '5.9 KB', label: 'lightest build' },
  { value: '0', label: 'hot-linked assets' },
]

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden px-5 pt-32 pb-16 sm:px-8 sm:pt-40">
      {/* A single soft bloom behind the headline — the previews carry the colour,
          so the chrome stays almost monochrome. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full opacity-[0.07] blur-[120px]"
        style={{ background: 'var(--color-accent)' }}
      />

      <div className="relative mx-auto max-w-[1400px]">
        <motion.div
          {...rise(0)}
          className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <span className="text-[12px] font-500 tracking-wide text-muted uppercase">
            New study every week
          </span>
        </motion.div>

        <motion.h1
          {...rise(0.08)}
          className="mt-7 max-w-[15ch] text-[13vw] leading-[0.87] font-800 tracking-[-0.045em] sm:text-[9vw] lg:text-[7.5vw]"
        >
          {SITE.tagline.split(' ').slice(0, 2).join(' ')}{' '}
          <span className="text-muted">{SITE.tagline.split(' ').slice(2).join(' ')}</span>
        </motion.h1>

        <motion.p
          {...rise(0.18)}
          className="mt-8 max-w-[54ch] text-[16px] leading-relaxed font-400 text-muted sm:text-[18px]"
        >
          {SITE.blurb}
        </motion.p>

        <motion.div {...rise(0.28)} className="mt-10 flex flex-wrap items-center gap-3">
          <a
            href="#studies"
            className="rounded-full bg-paper px-7 py-3.5 text-[15px] font-600 text-ink transition-opacity hover:opacity-80"
          >
            Browse the studies
          </a>
          <a
            href="#how"
            className="rounded-full border border-line px-7 py-3.5 text-[15px] font-500 transition-colors hover:border-muted"
          >
            What you actually get
          </a>
        </motion.div>

        <motion.dl {...rise(0.38)} className="mt-16 flex flex-wrap gap-x-12 gap-y-6">
          {STATS.map((stat) => (
            <div key={stat.label}>
              <dt className="text-[32px] leading-none font-700 tracking-tight sm:text-[40px]">
                {stat.value}
              </dt>
              <dd className="mt-2 text-[13px] font-500 tracking-wide text-muted uppercase">
                {stat.label}
              </dd>
            </div>
          ))}
        </motion.dl>
      </div>
    </section>
  )
}
