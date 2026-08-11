import { motion } from 'motion/react'

/**
 * The differentiator section. Every line here is a thing competitors in this
 * category get wrong — keep it concrete and checkable, not aspirational.
 */
const POINTS = [
  {
    n: '01',
    title: 'The code, not a prompt',
    body: 'You get the working source. No pasting a spec into a tool and hoping it renders what the screenshot showed — the build in the preview is the build you download.',
  },
  {
    n: '02',
    title: 'Assets ship in the bundle',
    body: 'Every image and video is licensed and included. Nothing points at our CDN, so nothing breaks when we redeploy, and your client sites never depend on us staying online.',
  },
  {
    n: '03',
    title: 'Video, never GIF',
    body: 'Motion previews are WebM and MP4. A comparable GIF-based hero ships upwards of 8 MB per tile; ours ship in kilobytes and still pass a Lighthouse audit.',
  },
  {
    n: '04',
    title: 'Reduced motion is handled',
    body: 'Every study honours prefers-reduced-motion and degrades on touch, where cursor-driven effects can never fire. Written in, not bolted on.',
  },
]

export default function HowItWorks() {
  return (
    <section id="how" className="border-t border-line px-5 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-[1400px]">
        <h2 className="max-w-[18ch] text-[9vw] leading-[0.95] font-800 tracking-[-0.04em] sm:text-[5vw] lg:text-[3.6vw]">
          What you actually get
        </h2>

        <div className="mt-14 grid gap-x-12 gap-y-10 sm:grid-cols-2">
          {POINTS.map((point, i) => (
            <motion.div
              key={point.n}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay: i * 0.08 }}
              className="border-t border-line pt-6"
            >
              <span className="text-[13px] font-600 text-accent">{point.n}</span>
              <h3 className="mt-3 text-[20px] font-600 tracking-tight sm:text-[22px]">
                {point.title}
              </h3>
              <p className="mt-3 max-w-[46ch] text-[15px] leading-relaxed text-muted">
                {point.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
