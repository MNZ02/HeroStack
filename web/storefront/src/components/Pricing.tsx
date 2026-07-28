import { motion } from 'motion/react'
import { SITE, TIERS } from '../site'

export default function Pricing() {
  return (
    <section id="pricing" className="border-t border-line px-5 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-[1400px]">
        <h2 className="max-w-[16ch] text-[9vw] leading-[0.95] font-800 tracking-[-0.04em] sm:text-[5vw] lg:text-[3.6vw]">
          Buy once. Keep it.
        </h2>
        <p className="mt-5 max-w-[52ch] text-[16px] leading-relaxed text-muted">
          No subscription, no seat metering, no expiring licence. Client work is
          covered on every tier.
        </p>

        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {TIERS.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay: i * 0.08 }}
              className={`flex flex-col rounded-3xl border p-7 sm:p-8 ${
                tier.highlight
                  ? 'border-accent/40 bg-ink-soft'
                  : 'border-line bg-ink-soft/40'
              }`}
            >
              {tier.highlight && (
                <span className="mb-5 self-start rounded-full bg-accent px-2.5 py-1 text-[11px] font-700 tracking-wide text-ink uppercase">
                  Most taken
                </span>
              )}

              <h3 className="text-[17px] font-600">{tier.name}</h3>
              <p className="mt-1.5 text-[14px] text-muted">{tier.blurb}</p>

              <div className="mt-7 flex items-baseline gap-2">
                <span className="text-[46px] leading-none font-800 tracking-tight">
                  {tier.price}
                </span>
                <span className="text-[14px] text-muted">{tier.period}</span>
              </div>

              <ul className="mt-7 flex flex-1 flex-col gap-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex gap-3 text-[14px] leading-snug">
                    <span aria-hidden="true" className="mt-[2px] text-accent">
                      ✓
                    </span>
                    <span className={tier.highlight ? '' : 'text-muted'}>{feature}</span>
                  </li>
                ))}
              </ul>

              <a
                href={`mailto:${SITE.email}?subject=${encodeURIComponent(`${tier.name} — enquiry`)}`}
                className={`mt-8 rounded-full px-6 py-3.5 text-center text-[15px] font-600 transition-opacity hover:opacity-80 ${
                  tier.highlight
                    ? 'bg-paper text-ink'
                    : 'border border-line font-500 text-paper'
                }`}
              >
                Get {tier.name.toLowerCase()}
              </a>
            </motion.div>
          ))}
        </div>

        <p className="mt-8 text-[13px] text-muted">
          Checkout is not wired up yet — every button opens a mail draft.
        </p>
      </div>
    </section>
  )
}
