import { useLayoutEffect, useRef } from 'react'
import BrandMark from '../components/BrandMark'
import CursorLens from '../components/CursorLens'
import Divider from '../components/Divider'
import SideRail from '../components/SideRail'
import { gsap, prefersReducedMotion, trackPointer } from '../lib/motion'

// Served straight out of /public — no bundler rewrite, no base64 inlining.
// WebP for everyone current, JPEG for the long tail.
const HERO_BG = '/assets/hero-bg.webp'
const HERO_BG_JPG = '/assets/hero-bg.jpg'
const HERO_BG_BNW = '/assets/hero-bg-bnw.webp'
const HERO_BG_BNW_JPG = '/assets/hero-bg-bnw.jpg'

/** A headline line that slides up out of its own mask. */
function MaskedLine({ children }) {
  return (
    <span className="block overflow-hidden pb-[0.08em]">
      <span data-headline className="block">
        {children}
      </span>
    </span>
  )
}

export default function Hero() {
  const root = useRef(null)
  const scene = useRef(null)
  const copy = useRef(null)

  useLayoutEffect(() => {
    const ctx = gsap.context((self) => {
      const q = self.selector
      const reduced = prefersReducedMotion()

      if (reduced) {
        gsap.set(q('.reveal'), { opacity: 1, y: 0, yPercent: 0 })
        return
      }

      const tl = gsap.timeline({
        defaults: { ease: 'power3.out' },
        delay: 0.15,
      })

      tl.fromTo(
        scene.current,
        { scale: 1.14, opacity: 0 },
        { scale: 1, opacity: 1, duration: 2.2, ease: 'power2.out' },
      )
        .fromTo(
          q('[data-rail-label]'),
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: 1 },
          0.5,
        )
        .fromTo(
          q('[data-rail-line]'),
          { scaleY: 0 },
          { scaleY: 1, duration: 1.4, ease: 'power2.inOut' },
          0.5,
        )
        .fromTo(
          q('[data-rail-diamond]'),
          { opacity: 0, scale: 0 },
          { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(2)' },
          1.5,
        )
        .fromTo(
          q('[data-brand]'),
          { opacity: 0, y: -14 },
          { opacity: 1, y: 0, duration: 1 },
          0.4,
        )
        .fromTo(
          q('[data-headline]'),
          { yPercent: 115 },
          { yPercent: 0, duration: 1.3, stagger: 0.12 },
          0.6,
        )
        .fromTo(
          q('[data-rule]'),
          { scaleX: 0 },
          { scaleX: 1, duration: 0.9, ease: 'power2.inOut' },
          1.3,
        )
        .fromTo(
          q('[data-fade]'),
          { opacity: 0, y: 26 },
          { opacity: 1, y: 0, duration: 1, stagger: 0.14 },
          1.15,
        )
        .fromTo(
          q('[data-divider]'),
          { opacity: 0 },
          { opacity: 1, duration: 1.2 },
          1.9,
        )

      // Scroll parallax: the scene drifts down and dims as the hero leaves.
      gsap.to(scene.current, {
        yPercent: 12,
        scale: 1.06,
        ease: 'none',
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      })

      gsap.to(copy.current, {
        yPercent: -14,
        opacity: 0.25,
        ease: 'none',
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      })

      // Pointer parallax: background and copy drift against each other.
      const moveBg = gsap.quickTo(scene.current, 'x', {
        duration: 1.1,
        ease: 'power3.out',
      })
      const moveBgY = gsap.quickTo(scene.current, 'y', {
        duration: 1.1,
        ease: 'power3.out',
      })
      const moveCopy = gsap.quickTo(copy.current, 'x', {
        duration: 1.4,
        ease: 'power3.out',
      })

      const untrack = trackPointer((x, y) => {
        moveBg(x * -22)
        moveBgY(y * -14)
        moveCopy(x * 8)
      })

      return () => untrack()
    }, root)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={root}
      id="hero"
      className="relative flex min-h-svh w-full flex-col overflow-hidden bg-ink"
    >
      {/* Scene. Everything that has to stay pixel-aligned with the artwork —
          the colour frame and the black-and-white lens — lives inside one
          transform group, so the parallax can never pull them apart. The group
          overscans the section so that drift never exposes an edge. */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div ref={scene} className="absolute -inset-6 will-change-transform">
          <picture>
            <source srcSet={HERO_BG} type="image/webp" />
            <img
              src={HERO_BG_JPG}
              alt="A lone samurai resting beside a river beneath red maple, a dark horse waiting in the mist"
              className="size-full object-cover object-[30%_50%] lg:object-center"
              fetchPriority="high"
            />
          </picture>
          <CursorLens
            sceneRef={scene}
            src={HERO_BG_BNW}
            fallback={HERO_BG_BNW_JPG}
          />
        </div>

        {/* Legibility scrims. Kept deliberately light over the left two thirds
            so the samurai, the horse and the maple stay readable — the weight
            sits on the right column, behind the copy. */}
        <div className="absolute inset-0 bg-[linear-gradient(to_left,rgba(5,5,5,0.9)_0%,rgba(5,5,5,0.55)_35%,rgba(5,5,5,0.1)_65%,transparent_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(5,5,5,0.88)_0%,transparent_42%,transparent_74%,rgba(5,5,5,0.5)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,transparent_45%,rgba(5,5,5,0.5)_100%)]" />

        {/* Narrow screens only: the copy centres over the brightest part of the
            scene, exactly where the right-weighted scrim above does the least. */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(5,5,5,0.62)_26%,rgba(5,5,5,0.62)_70%,transparent_100%)] lg:hidden" />

        {/* Film grain. Sits above the scrims so it breaks up the banding the
            gradients would otherwise show on a dark, smooth sky. */}
        <div className="grain absolute inset-0 opacity-[0.16] mix-blend-overlay" />
      </div>

      <SideRail />

      {/* Masthead */}
      <header className="relative z-20 flex items-start justify-between px-6 pt-7 sm:px-10 lg:px-16 lg:pt-10 xl:px-24">
        <span aria-hidden="true" />
        <BrandMark data-brand className="reveal" />
      </header>

      {/* Copy */}
      <div className="relative z-10 flex flex-1 items-center px-6 py-16 sm:px-10 lg:px-16 xl:px-24">
        <div
          ref={copy}
          className="ml-auto w-full max-w-2xl text-center will-change-transform lg:text-right"
        >
          <p
            data-fade
            className="reveal font-sans text-[0.7rem] font-light tracking-[0.42em] text-bone/85 sm:text-sm sm:tracking-[0.5em]"
          >
            VISUAL STORYTELLER
          </p>

          {/* Shrink-wraps to the headline on lg so the red rule can hang off
              its left edge the way it does in the reference. */}
          <div className="mt-5 lg:inline-block lg:text-right">
            <h1 className="font-display text-[clamp(2.15rem,7vw,4.4rem)] font-light leading-[1.02] tracking-[0.01em] text-bone uppercase">
              <MaskedLine>Comic Designer</MaskedLine>
              <MaskedLine>
                <span className="text-blood">&amp;</span> Illustrator
              </MaskedLine>
            </h1>

            <span
              data-rule
              className="mx-auto mt-7 block h-px w-20 origin-center bg-blood lg:ml-0 lg:origin-left"
            />
          </div>

          <p
            data-fade
            className="reveal mx-auto mt-7 max-w-xl font-display text-xl text-bone/95 sm:text-2xl lg:mr-0"
          >
            Crafting Visual Legends, One Panel at a Time.
          </p>

          <p
            data-fade
            className="reveal mx-auto mt-5 max-w-md font-sans text-sm font-light leading-relaxed text-fog sm:text-[0.95rem] lg:mr-0"
          >
            From concept to final frame, I bring stories to life with dynamic
            art, expressive characters, and cinematic storytelling.
          </p>

          {/* The focus ring is bone: a red ring on a red button is invisible. */}
          <div data-fade className="reveal mt-10 lg:flex lg:justify-end">
            <a
              href="#works"
              className="group relative inline-flex items-center gap-5 overflow-hidden bg-blood px-9 py-4 font-sans text-xs font-medium tracking-[0.28em] text-bone transition-colors duration-500 hover:bg-blood-deep focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bone sm:px-11 sm:py-5 sm:text-sm"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-full" />
              <span className="relative">VIEW PORTFOLIO</span>
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="relative size-4 transition-transform duration-500 group-hover:rotate-90"
                fill="currentColor"
              >
                <path d="M12 1.5 13.9 9 21.5 12 13.9 15 12 22.5 10.1 15 2.5 12 10.1 9z" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Scroll cue — the page continues, and nothing else says so. */}
      <a
        data-fade
        href="#works"
        className="reveal group relative z-10 mx-auto flex flex-col items-center gap-3 pb-6 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bone"
      >
        <span className="font-sans text-[0.6rem] font-light tracking-[0.4em] text-fog transition-colors duration-500 group-hover:text-bone">
          SCROLL
        </span>
        <span className="relative h-10 w-px overflow-hidden bg-bone/15">
          <span className="scroll-tick absolute inset-x-0 top-0 h-4 bg-blood" />
        </span>
      </a>

      <div
        data-divider
        className="reveal relative z-10 px-6 pb-8 sm:px-10 lg:px-16 xl:px-24"
      >
        <Divider />
      </div>
    </section>
  )
}
