import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import BlackPanel from './components/BlackPanel'
import Cursor from './components/Cursor'
import HeroChrome from './components/HeroChrome'
import VideoStage from './components/VideoStage'
import { useViewport } from './lib/viewport'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const SYMBOLS = ['8', '$', '^^', '%', '/'] as const

export default function App() {
  const viewport = useViewport()
  const root = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const wrap = useRef<HTMLDivElement>(null)

  // How far the gallery can travel under the fixed panel before the outro
  // begins. Measured from the wrapper, so it follows the column count.
  const [maxScroll, setMaxScroll] = useState(0)

  useEffect(() => {
    const node = wrap.current
    if (!node) return

    const measure = () =>
      setMaxScroll(Math.max(0, node.scrollHeight - window.innerHeight))

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    window.addEventListener('resize', measure)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [viewport.width])

  // The panel ride-up is the one piece handed to ScrollTrigger; everything
  // downstream of it reads real geometry off the DOM instead.
  useGSAP(
    () => {
      if (!panel.current || !root.current) return
      gsap.fromTo(
        panel.current,
        { y: () => window.innerHeight },
        {
          y: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: root.current,
            start: 0,
            end: () => window.innerHeight,
            scrub: true,
            invalidateOnRefresh: true,
          },
        },
      )
    },
    { scope: root, dependencies: [maxScroll] },
  )

  // One loop drives the gallery, the outro and the video teardown. Card scale
  // is derived from measured rects rather than from scroll maths, so it stays
  // correct no matter where ScrollTrigger has left the panel mid-frame.
  useEffect(() => {
    let frame = 0

    const tick = () => {
      frame = requestAnimationFrame(tick)

      const vh = window.innerHeight
      const scrollY = window.scrollY

      const wrapper = wrap.current
      if (wrapper) {
        const shift = scrollY > vh ? -(scrollY - vh) : 0
        wrapper.style.transform = `translateY(${shift}px)`
      }

      const cards = panel.current?.querySelectorAll<HTMLElement>('.bp-card')
      cards?.forEach((card) => {
        const { top, bottom } = card.getBoundingClientRect()

        let scale = 0
        if (bottom > 0 && top < vh) {
          const enter = Math.min(1, (vh - top) / (vh * 0.6))
          const exit = Math.min(1, bottom / (vh * 0.4))
          scale = Math.max(0, Math.min(enter, exit))
        }

        card.style.transform = `scale(${scale})`
      })

      // Outro: white takes the screen, the price lifts, the pill grows in.
      const outroStart = vh + maxScroll
      const progress = Math.max(
        0,
        Math.min(1, (scrollY - outroStart) / Math.max(1, vh - 100)),
      )

      const overlay = document.getElementById('outro-overlay')
      const info = document.getElementById('outro-info')
      const buy = document.getElementById('outro-buy')
      const footer = document.getElementById('outro-footer')

      if (overlay) overlay.style.opacity = `${progress}`
      if (footer) footer.style.opacity = `${progress}`
      if (buy) buy.style.transform = `scale(${progress})`
      if (info) {
        const offset = Number(info.dataset.outroOffset ?? 0)
        info.style.transform = `translateY(${-progress * offset}px)`
      }

      const canvas = document.getElementById('main-canvas')
      if (canvas) canvas.style.visibility = scrollY > vh ? 'hidden' : 'visible'
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [maxScroll])

  // Cycles the mark inside the circle as you scroll, slow enough to read.
  useEffect(() => {
    let last = 0
    const onScroll = () => {
      const now = performance.now()
      if (now - last < 80) return
      last = now
      const node = document.getElementById('circle-symbol')
      if (node) node.textContent = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const spacerHeight =
    maxScroll > 0 ? `${window.innerHeight + maxScroll + 2 * window.innerHeight}px` : '500vh'

  return (
    <div
      id="scroll-spacer"
      ref={root}
      style={{
        position: 'relative',
        background: '#fff',
        userSelect: 'none',
        height: spacerHeight,
        cursor: viewport.isDesktop && !viewport.isTouch ? 'none' : 'auto',
      }}
    >
      <VideoStage viewport={viewport} />
      <BlackPanel panelRef={panel} wrapRef={wrap} width={viewport.width} />
      <HeroChrome viewport={viewport} />
      {viewport.isDesktop && !viewport.isTouch && <Cursor />}
    </div>
  )
}
