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
  /** Path under `public/prompts/`, or null while the spec is still being written. */
  prompt: string | null
  added: string
}

/**
 * Where each study is reachable.
 *
 * In a production build `npm run build:site` mounts every study inside the
 * storefront's own dist at `/studies/<slug>/`, so a relative path is all that
 * is needed and the demos deploy as one tree.
 *
 * `npm run dev` has no such tree — each study is its own Vite server. Those
 * ports are pinned with `--strictPort` in each workspace's `dev` script, which
 * is what makes this map true; left on Vite's default the servers land on
 * 5173+ in whatever order they boot and none of these would answer.
 *
 * So: change a port here, change it in that workspace's package.json too.
 * They only resolve while `npm run dev` is running.
 */
const DEV_PORTS: Record<string, number> = {
  raptor: 5307,
  comicraft: 5301,
  'vision-reveal': 5302,
  prmpt: 5303,
  aeris: 5304,
  lucifer: 5305,
  v8: 5306,
  'deep-sea-jellybot': 5308,
}

export const demoUrl = (slug: string) =>
  import.meta.env.DEV ? `http://localhost:${DEV_PORTS[slug]}/` : `/studies/${slug}/`

export const STUDIES: readonly Study[] = [
  {
    slug: 'deep-sea-jellybot',
    name: 'Abyssal Medusa — Sim',
    category: 'Interactive',
    tagline: 'A robotic jellyfish inside a paper-blueprint mission console, stripped to three core components.',
    about:
      'A deep-sea jellyfish drone drawn like an engineering datasheet: a wireframe membrane dome over stacked machinery plates, a red-panelled utility spine, and sixteen beaded actuator limbs — every part generated geometry on a plotted-paper HUD. The exploded view separates the assembly into its three core components — neural dome, utility spine, propulsor limb — with the dome itself peeling apart into mast, membrane, guts and plates; each component has a dedicated camera focus. Tentacles are two instanced meshes solved as beaded kinematic chains every frame.',
    preview: '/previews/deep-sea-jellybot.jpg',
    weight: '140 KB gzip',
    stack: ['three.js', 'Vanilla JS', 'Vite', 'Zero assets'],
    technique: ['Wireframe membrane', 'Instanced kinematics', 'Component exploded view', 'Canvas HUD'],
    prompt: null,
    added: '2026-08-24',
  },
  {
    slug: 'raptor',
    name: 'Raptor — Cutaway',
    category: 'Interactive',
    tagline: 'A full-flow staged-combustion methalox engine you throttle and strip to the burning chamber.',
    about:
      "A SpaceX Raptor built entirely as generated geometry — no model file, no asset pipeline. The bell nozzle, throat and regeneratively-cooled chamber are a surface of revolution; two preburner/turbopump modules hang off the sides behind a web of feed lines. Throttle it and the turbopumps spin, the injector sprays and the chamber begins to glow. The exploded cutaway peels in order: the looping feed network and twin modules lift clear, the bell drops away, then the cooling jacket strips and the chamber ghosts translucent so you watch the injector plate, shock diamonds and the burn inside, down to a bare hot section with a glowing throat — the separated shells staying visible in the periphery.",
    preview: '/previews/raptor.jpg',
    weight: '151 KB gzip',
    stack: ['three.js', 'TypeScript', 'Vite', 'Zero assets'],
    technique: ['Surface of revolution', 'Exploded layers', 'Animated burn', 'Shock diamonds'],
    prompt: null,
    added: '2026-08-24',
  },
  {
    slug: 'v8',
    name: 'V8 — Cutaway',
    category: 'Interactive',
    tagline: 'A running big-block you orbit, rev, and strip layer by layer.',
    about:
      'No model file, no assets — the entire engine is generated geometry. A cross-plane crank with throws at 0/90/270/180° drives eight rods solved by slider-crank kinematics every frame, so the pistons genuinely answer to the crank, not to a canned loop. The layers peel in order: intake and valve covers lift off, heads and pan slide away along their bank axes, then the block ghosts translucent so the rotating assembly keeps turning over inside it.',
    preview: '/previews/v8.jpg',
    weight: '142 KB gzip',
    stack: ['three.js', 'TypeScript', 'Vite', 'Zero assets'],
    technique: ['Procedural geometry', 'Slider-crank kinematics', 'Ghosted layers'],
    prompt: null,
    added: '2026-08-22',
  },
  {
    slug: 'lucifer',
    name: 'LUCIFER — The Fall',
    category: 'Cinematic',
    tagline: 'A scroll-scrubbed descent, frame by frame toward the floor.',
    about:
      'A film you do not watch but climb down. Scroll position maps to a frame index across a 121-frame sequence, with a loader that probes frames until a miss when no manifest is present and a video fallback if they never arrive. The chrome around it — clock, progress readout, staged reveals — is timed off the same scroll value, so page and footage fall together.',
    preview: '/previews/lucifer.jpg',
    weight: '2 KB gzip + 19 MB frames',
    stack: ['Vanilla JS', 'Canvas 2D', 'Frame sequence'],
    technique: ['Scroll-scrubbed frames', 'Probe loader', 'Video fallback'],
    prompt: null,
    added: '2026-08-15',
  },
  {
    slug: 'aeris',
    name: 'Aeris — Respirator',
    category: 'Product',
    tagline: 'A head turn you steer with the cursor, held one frame at a time.',
    about:
      'The same cursor-to-position idea as prmpt, built the other way round. Instead of seeking a video — whose single keyframe made every seek decode from the start, capping the scrub near 8fps — the turn ships as thirty webp stills, and the pointer picks one by index. Only one direction of footage is downloaded: the subject is near-symmetric on a flat ground, so the opposite turn is the same frames under scaleX(-1).',
    preview: '/previews/aeris.jpg',
    weight: '62 KB gzip + 768 KB frames',
    stack: ['React 19', 'TypeScript', 'Tailwind 4', 'No animation library'],
    technique: ['Frame-addressed scrub', 'Mirrored sequence', 'Self-hosted assets'],
    prompt: null,
    added: '2026-08-10',
  },
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
    prompt: null,
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
    prompt: '/prompts/comicraft.md',
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
    prompt: null,
    added: '2026-07-27',
  },
]

export const CATEGORIES = ['All', ...new Set(STUDIES.map((s) => s.category))]
