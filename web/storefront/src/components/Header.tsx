import { useEffect, useState } from 'react'
import { SITE } from '../site'

const LINKS = [
  { label: 'Studies', href: '#studies' },
  { label: 'How it works', href: '#how' },
  { label: 'Pricing', href: '#pricing' },
]

export default function Header() {
  const [lifted, setLifted] = useState(false)

  useEffect(() => {
    const onScroll = () => setLifted(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        lifted ? 'border-b border-line bg-ink/80 backdrop-blur-xl' : 'border-b border-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-5 sm:px-8">
        <a href="#top" className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-paper">
            <span className="flex flex-col gap-[3px]">
              <span className="block h-[3px] w-3.5 rounded-full bg-ink" />
              <span className="block h-[3px] w-2 rounded-full bg-ink" />
            </span>
          </span>
          <span className="text-[15px] font-700 tracking-tight">{SITE.name}</span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[14px] font-500 text-muted transition-colors hover:text-paper"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <a
          href="#pricing"
          className="rounded-full bg-paper px-4 py-2 text-[13px] font-600 text-ink transition-opacity hover:opacity-80 sm:px-5"
        >
          Get the archive
        </a>
      </div>
    </header>
  )
}
