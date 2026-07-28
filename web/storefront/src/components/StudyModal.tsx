import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { Study } from '../data/studies'
import { demoUrl } from '../data/studies'
import { SITE } from '../site'

type Props = { study: Study | null; onClose: () => void }

type CopyState = 'idle' | 'working' | 'copied' | 'failed'

export default function StudyModal({ study, onClose }: Props) {
  const [copy, setCopy] = useState<CopyState>('idle')
  const [live, setLive] = useState(false)

  useEffect(() => {
    setCopy('idle')
    // The live frame is opt-in per study — prmpt alone pulls 8 MB of video,
    // which nobody should pay for just by opening a panel.
    setLive(false)
  }, [study?.slug])

  // Escape closes, and the page behind must not scroll while this is up.
  useEffect(() => {
    if (!study) return

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)

    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [study, onClose])

  const copySpec = async () => {
    if (!study?.prompt) return
    setCopy('working')
    try {
      const response = await fetch(study.prompt)
      if (!response.ok) throw new Error(String(response.status))
      await navigator.clipboard.writeText(await response.text())
      setCopy('copied')
      setTimeout(() => setCopy('idle'), 2200)
    } catch {
      setCopy('failed')
      setTimeout(() => setCopy('idle'), 2600)
    }
  }

  const copyLabel = {
    idle: 'Copy build spec',
    working: 'Copying…',
    copied: 'Copied to clipboard',
    failed: 'Copy failed — try again',
  }[copy]

  return (
    <AnimatePresence>
      {study && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <div
            className="fixed inset-0 bg-ink/85 backdrop-blur-md"
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={study.name}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.99 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="relative my-auto w-full max-w-[1080px] overflow-hidden rounded-3xl border border-line bg-ink-soft"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute top-4 right-4 z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-ink/70 text-[18px] leading-none backdrop-blur-md transition-colors hover:bg-ink"
            >
              ×
            </button>

            <div className="relative h-[42vh] min-h-[260px] border-b border-line bg-ink">
              {live ? (
                <iframe
                  src={demoUrl(study.slug)}
                  title={`${study.name} live demo`}
                  loading="lazy"
                  className="h-full w-full"
                  // Same-origin in production (the studies are mounted under
                  // this domain), so scripts are allowed but nothing else.
                  sandbox="allow-scripts allow-same-origin"
                />
              ) : (
                <>
                  <img
                    src={study.preview}
                    alt={`${study.name} hero`}
                    className="h-full w-full object-cover object-top"
                  />
                  <button
                    type="button"
                    onClick={() => setLive(true)}
                    className="absolute inset-0 flex cursor-pointer items-center justify-center bg-ink/30 opacity-0 transition-opacity hover:opacity-100"
                  >
                    <span className="rounded-full bg-paper px-6 py-3 text-[14px] font-600 text-ink">
                      ▶ Run it live
                    </span>
                  </button>
                </>
              )}

              {live && (
                <button
                  type="button"
                  onClick={() => setLive(false)}
                  // Parked beside the close button rather than in a corner of
                  // the frame: every study fills its own corners, and this is
                  // storefront chrome, not part of the demo.
                  className="absolute top-4 right-16 z-10 cursor-pointer rounded-full bg-ink/80 px-3.5 py-1.5 text-[12px] font-500 backdrop-blur-md transition-colors hover:bg-ink"
                >
                  Show still
                </button>
              )}
            </div>

            <div className="grid gap-8 p-6 sm:p-9 md:grid-cols-[1.4fr_1fr]">
              <div>
                <span className="text-[12px] font-500 tracking-wide text-muted uppercase">
                  {study.category}
                </span>
                <h2 className="mt-2 text-[30px] leading-tight font-700 tracking-tight sm:text-[38px]">
                  {study.name}
                </h2>
                <p className="mt-4 text-[15px] leading-relaxed text-muted sm:text-[16px]">
                  {study.about}
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  {study.technique.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-line px-3 py-1.5 text-[12px] font-500"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-4 border-y border-line py-5">
                  <div>
                    <dt className="text-[11px] tracking-wide text-muted uppercase">Ships</dt>
                    <dd className="mt-1 text-[15px] font-600">{study.weight}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] tracking-wide text-muted uppercase">Assets</dt>
                    <dd className="mt-1 text-[15px] font-600">Self-hosted</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-[11px] tracking-wide text-muted uppercase">Stack</dt>
                    <dd className="mt-1 text-[14px] font-500">{study.stack.join(' · ')}</dd>
                  </div>
                </dl>

                <div className="flex flex-col gap-2.5">
                  <a
                    href={`mailto:${SITE.email}?subject=${encodeURIComponent(`${study.name} — study request`)}`}
                    className="rounded-full bg-paper px-6 py-3.5 text-center text-[15px] font-600 text-ink transition-opacity hover:opacity-80"
                  >
                    Get this study
                  </a>

                  <button
                    type="button"
                    onClick={copySpec}
                    disabled={!study.prompt || copy === 'working'}
                    className="cursor-pointer rounded-full border border-line px-6 py-3.5 text-[15px] font-500 transition-colors hover:border-muted disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {study.prompt ? copyLabel : 'Build spec in progress'}
                  </button>

                  <a
                    href={demoUrl(study.slug)}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full px-6 py-3 text-center text-[14px] font-500 text-muted transition-colors hover:text-paper"
                  >
                    Open full screen ↗
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
