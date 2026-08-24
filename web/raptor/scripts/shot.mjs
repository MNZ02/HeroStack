import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = join(here, 'shots')
import { mkdirSync } from 'node:fs'
mkdirSync(OUT, { recursive: true })

const url = process.argv[2] ?? 'http://localhost:5307/'
const outName = process.argv[3] ?? 'shot'
const clickLevel = process.argv[4] // optional level index to click
const noDrag = process.argv[5] === 'nodrag'

const CHROME =
  process.env.CHROME_PATH ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const { default: puppeteer } = await import('puppeteer-core')

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })
await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 })
await new Promise((r) => setTimeout(r, 1200))

if (clickLevel !== undefined) {
  const target = await page.evaluate((idx) => {
    const b = document.querySelectorAll('.layer')[idx]
    if (b) b.click()
    return !!b
  }, Number(clickLevel))
  console.log('clicked level', clickLevel, target)
  await new Promise((r) => setTimeout(r, 1500))
}

// aim the camera a little nicer: orbit a touch right and lower (mouse drag)
if (!noDrag) {
  await page.mouse.move(720, 450)
  await page.mouse.down()
  await page.mouse.move(720 + 40, 450 + 20, { steps: 10 })
  await page.mouse.up()
  await new Promise((r) => setTimeout(r, 800))
}

const png = join(OUT, `${outName}.png`)
await page.screenshot({ path: png })
execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '82', '-Z', '1440', png, '--out', join(OUT, `${outName}.jpg`)])
console.log('wrote', join(OUT, `${outName}.jpg`))
await browser.close()
