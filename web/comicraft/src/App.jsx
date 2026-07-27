import Hero from './sections/Hero'

export default function App() {
  return (
    <main className="relative min-h-svh bg-ink">
      <Hero />

      {/* Next sections land here: Workflow → Featured Works → Process → CTA */}
      <section id="works" className="h-px w-full" aria-hidden="true" />
    </main>
  )
}
