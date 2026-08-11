/**
 * Regenerates `public/previews/*.jpg` from the live studies.
 *
 * Every study reveals its effect on pointer movement, so the cursor is parked
 * somewhere flattering before the shutter — a cold screenshot of these pages
 * shows the *un*-revealed state, which is the boring half.
 *
 *   1. npm run dev            (studies pin themselves to 5301-5304)
 *   2. npm run previews --workspace=storefront
 *
 * Needs puppeteer-core and a local Chrome; neither is a dependency of this
 * workspace, since previews are regenerated rarely and by hand.
 *   npm i -g puppeteer-core
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'previews')

const CHROME =
  process.env.CHROME_PATH ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const SHOTS = [
  { slug: 'comicraft', url: 'http://localhost:5301/', mouse: [980, 430] },
  { slug: 'vision-reveal', url: 'http://localhost:5302/', mouse: [720, 420] },
  { slug: 'prmpt', url: 'http://localhost:5303/', mouse: [1180, 450] },
  { slug: 'aeris', url: 'http://localhost:5304/', mouse: [1180, 450] },
]

const { default: puppeteer } = await import('puppeteer-core')

mkdirSync(OUT, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--hide-scrollbars', '--autoplay-policy=no-user-gesture-required'],
})

for (const shot of SHOTS) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })
  await page.goto(shot.url, { waitUntil: 'networkidle2', timeout: 60_000 })
  await new Promise((r) => setTimeout(r, 3000))
  await page.mouse.move(shot.mouse[0], shot.mouse[1], { steps: 30 })
  await new Promise((r) => setTimeout(r, 1800))

  const png = join(OUT, `${shot.slug}.png`)
  await page.screenshot({ path: png })
  await page.close()

  // Retina capture down to a 1440px JPEG — ~170 KB each, versus ~4 MB raw.
  execFileSync('sips', [
    '-s', 'format', 'jpeg',
    '-s', 'formatOptions', '80',
    '-Z', '1440',
    png,
    '--out', join(OUT, `${shot.slug}.jpg`),
  ])
  rmSync(png)

  console.log('captured', shot.slug)
}

await browser.close()
