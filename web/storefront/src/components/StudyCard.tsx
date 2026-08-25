import { motion } from 'motion/react'
import type { Study } from '../data/studies'

type Props = { study: Study; index: number; onOpen: (slug: string) => void }

export default function StudyCard({ study, index, onOpen }: Props) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay: index * 0.07 }}
      className="group"
    >
      <button
        type="button"
        onClick={() => onOpen(study.slug)}
        className="block w-full cursor-pointer text-left"
      >
        <div className="relative overflow-hidden rounded-2xl border border-line bg-ink-soft">
          <img
            src={study.preview}
            alt={`${study.name} hero`}
            width={1440}
            height={900}
            loading={index < 2 ? 'eager' : 'lazy'}
            decoding="async"
            className="aspect-[16/10] w-full object-cover object-top transition-transform duration-[900ms] ease-out group-hover:scale-[1.03]"
          />

          <span className="absolute top-3 left-3 rounded-full bg-ink/70 px-2.5 py-1 text-[11px] font-600 tracking-wide uppercase backdrop-blur-md">
            {study.category}
          </span>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex translate-y-2 items-center justify-between bg-gradient-to-t from-ink/90 to-transparent p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <span className="text-[13px] font-600">View study</span>
            <span className="text-[13px] font-500 text-muted">{study.weight}</span>
          </div>
        </div>

        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-[17px] font-600 tracking-tight">{study.name}</h3>
            <p className="mt-1.5 max-w-[42ch] text-[14px] leading-snug text-muted">
              {study.tagline}
            </p>
          </div>
          <span className="mt-1 shrink-0 text-[12px] font-500 text-muted">
            {study.stack[0]}
          </span>
        </div>
      </button>
    </motion.article>
  )
}
