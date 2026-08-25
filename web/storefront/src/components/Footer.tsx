import { SITE } from '../site'

export default function Footer() {
  return (
    <footer className="border-t border-line px-5 py-12 sm:px-8">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[15px] font-700 tracking-tight">{SITE.name}</p>
          <p className="mt-1.5 text-[13px] text-muted">
            © {SITE.year} — built in the open.
          </p>
        </div>
        <div className="flex flex-wrap gap-6 text-[13px] text-muted">
          <a href="#studies" className="transition-colors hover:text-paper">
            Studies
          </a>
          <a href={`mailto:${SITE.email}`} className="transition-colors hover:text-paper">
            {SITE.email}
          </a>
        </div>
      </div>
    </footer>
  )
}
