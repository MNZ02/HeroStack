export type Study = {
  slug: string
  name: string
  category: string
  tagline: string
  /** Longer pitch, shown in the detail panel. */
  about: string
  preview: string
  /** Bytes the built page ships, measured from `npm run build`. */
  weight: string
  stack: readonly string[]
  technique: readonly string[]
  tier: 'free' | 'premium'
  /** Path under `public/prompts/`, or null while the spec is still being written. */
  prompt: string | null
  /** Where the study is deployed. Null until each workspace has a home. */
  demo: string | null
  added: string
}

export const STUDIES: readonly Study[] = [
  {
    slug: 'prmpt',
    name: 'prmpt — Archive',
    category: 'Fashion',
    tagline: 'A video hero you scrub with the cursor, into a scroll-stacked gallery.',
    about:
      'Two clips share one frame and neither of them plays. Cursor distance from centre maps straight to currentTime, so the footage answers to your hand. Scroll and a black panel rides up over it carrying a scattered archive grid, each card scaling in and out of view, closing on a white outro.',
    preview: '/previews/prmpt.jpg',
    weight: '148 KB gzip',
    stack: ['React 19', 'TypeScript', 'GSAP', 'Tailwind 4'],
    technique: ['Cursor-scrubbed video', 'Scroll panel', 'mix-blend-mode'],
    tier: 'premium',
    prompt: null,
    demo: null,
    added: '2026-07-28',
  },
  {
    slug: 'comicraft',
    name: 'Comicraft Studio',
    category: 'Portfolio',
    tagline: 'Cinematic samurai hero with a cursor lens that drains the colour out.',
    about:
      'A full-bleed scene under a GSAP load timeline, with scroll and pointer parallax layered on top. The lens follows your cursor and reveals a black-and-white grade of the identical frame in perfect registration — the second copy counter-translates by exactly as much as the lens moves, which is what stops the two from ever drifting apart.',
    preview: '/previews/comicraft.jpg',
    weight: '108 KB gzip',
    stack: ['React 19', 'GSAP', 'ScrollTrigger', 'Tailwind 4'],
    technique: ['Cursor lens', 'Registered reveal', 'Parallax'],
    tier: 'premium',
    prompt: '/prompts/comicraft.md',
    demo: null,
    added: '2026-07-27',
  },
  {
    slug: 'vision-reveal',
    name: 'Saiyan Studio',
    category: 'Portfolio',
    tagline: 'A spotlight that burns through one frame to the transformation beneath.',
    about:
      'Two stacked frames, and a radial-gradient mask on the top one that tracks the pointer — so the reveal is a hole punched through the base layer rather than a crossfade. The whole thing is one hand-written HTML file: no React, no Tailwind, no animation library. Ships zero JavaScript framework.',
    preview: '/previews/vision-reveal.jpg',
    weight: '5.9 KB gzip',
    stack: ['Vanilla HTML', 'CSS masks', 'No framework'],
    technique: ['Mask spotlight', 'CSS-only splash', 'Word reveal'],
    tier: 'free',
    prompt: null,
    demo: null,
    added: '2026-07-27',
  },
]

export const CATEGORIES = ['All', ...new Set(STUDIES.map((s) => s.category))]
