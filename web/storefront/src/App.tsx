import { useCallback, useEffect, useMemo, useState } from 'react'
import Header from './components/Header'
import Hero from './components/Hero'
import HowItWorks from './components/HowItWorks'
import Pricing from './components/Pricing'
import Footer from './components/Footer'
import StudyCard from './components/StudyCard'
import StudyModal from './components/StudyModal'
import { CATEGORIES, STUDIES } from './data/studies'

const TIERS = ['All', 'Free', 'Premium'] as const

export default function App() {
  const [category, setCategory] = useState('All')
  const [tier, setTier] = useState<(typeof TIERS)[number]>('All')

  // The open study lives in the URL, so a card is linkable and the back button
  // closes the panel instead of leaving the page.
  const [slug, setSlug] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get('study'),
  )

  useEffect(() => {
    const onPop = () =>
      setSlug(new URLSearchParams(window.location.search).get('study'))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const open = useCallback((next: string) => {
    setSlug(next)
    history.pushState({ study: next }, '', `?study=${next}`)
  }, [])

  const close = useCallback(() => {
    setSlug(null)
    // Only rewind if we were the ones who pushed — otherwise drop the query.
    if (history.state?.study) history.back()
    else history.replaceState({}, '', window.location.pathname)
  }, [])

  const visible = useMemo(
    () =>
      STUDIES.filter(
        (study) =>
          (category === 'All' || study.category === category) &&
          (tier === 'All' || study.tier === tier.toLowerCase()),
      ),
    [category, tier],
  )

  const study = useMemo(
    () => STUDIES.find((item) => item.slug === slug) ?? null,
    [slug],
  )

  return (
    <>
      <Header />
      <main>
        <Hero />

        <section id="studies" className="px-5 pb-24 sm:px-8 sm:pb-32">
          <div className="mx-auto max-w-[1400px]">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    className={`cursor-pointer rounded-full px-4 py-2 text-[13px] font-500 transition-colors ${
                      category === item
                        ? 'bg-paper text-ink'
                        : 'border border-line text-muted hover:text-paper'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <div className="flex gap-1.5">
                {TIERS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setTier(item)}
                    className={`cursor-pointer rounded-full px-4 py-2 text-[13px] font-500 transition-colors ${
                      tier === item
                        ? 'border border-muted text-paper'
                        : 'border border-line text-muted hover:text-paper'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {visible.length > 0 ? (
              <div className="mt-8 grid gap-x-6 gap-y-12 md:grid-cols-2">
                {visible.map((item, i) => (
                  <StudyCard key={item.slug} study={item} index={i} onOpen={open} />
                ))}
              </div>
            ) : (
              <p className="mt-16 text-center text-[15px] text-muted">
                Nothing in that combination yet.
              </p>
            )}
          </div>
        </section>

        <HowItWorks />
        <Pricing />
      </main>
      <Footer />

      <StudyModal study={study} onClose={close} />
    </>
  )
}
