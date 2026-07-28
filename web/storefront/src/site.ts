/**
 * Everything brand-shaped lives here so renaming the shop is a one-file edit.
 * `HEROSTACK` is a working title, not a decision.
 */
export const SITE = {
  name: 'HEROSTACK',
  tagline: 'Motion heroes that ship',
  blurb:
    'Hand-built hero sections with the motion already solved. Every study comes with the working code and its own assets — nothing hot-linked, nothing that 404s next month.',
  email: 'hello@herostack.dev',
  year: 2026,
} as const

/**
 * No payment processor is wired to any of this. The tiers are presentation
 * only; the buttons open a mail draft. Wire real checkout before shipping.
 */
export const TIERS = [
  {
    name: 'Single study',
    price: '$39',
    period: 'one-time',
    blurb: 'One hero, start to finish.',
    features: [
      'Full source, MIT-licensed',
      'Every asset self-hosted in the bundle',
      'Build spec included',
      'Free fixes for that study',
    ],
    highlight: false,
  },
  {
    name: 'Full archive',
    price: '$149',
    period: 'one-time',
    blurb: 'Everything here, plus everything next.',
    features: [
      'All studies, current and future',
      'Shared motion primitives package',
      'Commercial use, unlimited client work',
      'Source video masters, not GIFs',
      'Priority fixes',
    ],
    highlight: true,
  },
  {
    name: 'Studio',
    price: '$490',
    period: 'one-time',
    blurb: 'For teams shipping client work weekly.',
    features: [
      'Everything in Full archive',
      'Up to 10 seats',
      'Brand-swapped variants on request',
      'Direct line for build questions',
    ],
    highlight: false,
  },
] as const
