import { FACE_SPEC, drawPlate } from './plates.js'

/**
 * The unfolded facelet map — the same state the 3D cube is in, read off its
 * transforms every time a turn lands, so the panel can't drift out of sync
 * with the geometry.
 *
 *       U
 *   L   F   R   B
 *       D
 */
const LAYOUT = { U: [1, 0], L: [0, 1], F: [1, 1], R: [2, 1], B: [3, 1], D: [1, 2] }

export class NetMap {
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.state = null
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const r = this.canvas.getBoundingClientRect()
    this.canvas.width = Math.max(1, Math.round(r.width * dpr))
    this.canvas.height = Math.max(1, Math.round(r.height * dpr))
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.w = r.width
    this.h = r.height
    if (this.state) this.draw(this.state)
  }

  draw(facelets) {
    this.state = facelets
    const ctx = this.ctx
    if (!this.w) this.resize()
    ctx.clearRect(0, 0, this.w, this.h)

    const cell = Math.min(this.w / 4, this.h / 3)
    const ox = (this.w - cell * 4) / 2
    const oy = (this.h - cell * 3) / 2
    const pad = cell * 0.045
    const s = (cell - pad * 2) / 3

    for (const [face, [fx, fy]] of Object.entries(LAYOUT)) {
      const x0 = ox + fx * cell + pad
      const y0 = oy + fy * cell + pad
      for (let i = 0; i < 9; i++) {
        const home = facelets[face][i]
        const spec = FACE_SPEC[home]
        const x = x0 + (i % 3) * s
        const y = y0 + ((i / 3) | 0) * s
        ctx.fillStyle = spec.color
        ctx.fillRect(x + 1, y + 1, s - 2, s - 2)
        // The centre keeps the face letter: it never moves, so it labels the map.
        if (i === 4) {
          ctx.fillStyle = spec.ink
          ctx.globalAlpha = 0.75
          ctx.font = `600 ${Math.round(s * 0.5)}px ui-monospace, Menlo, monospace`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(face, x + s / 2, y + s / 2 + 0.5)
          ctx.globalAlpha = 1
        }
      }
      ctx.strokeStyle = 'rgba(215,222,229,0.22)'
      ctx.lineWidth = 1
      ctx.strokeRect(Math.round(x0) + 0.5, Math.round(y0) + 0.5, Math.round(s * 3), Math.round(s * 3))
    }
  }
}

/** Six thumbnails of the real plate artwork, drawn by the same code the cube uses. */
export function buildLegend(el) {
  for (const [face, spec] of Object.entries(FACE_SPEC)) {
    const fig = document.createElement('figure')
    const canvas = document.createElement('canvas')
    drawPlate(canvas, face, 4)
    const cap = document.createElement('figcaption')
    cap.textContent = `${face}·${spec.name}`
    fig.append(canvas, cap)
    el.append(fig)
  }
}

/** Move queue strip: current turn lit, the next few bright, the rest dim. */
export function drawQueue(el, tokens, current) {
  const cells = [current, ...tokens].filter(Boolean)
  el.replaceChildren(
    ...cells.map((token, i) => {
      const span = document.createElement('span')
      span.textContent = token
      if (i === 0 && current) span.className = 'now'
      else if (i < 5) span.className = 'soon'
      return span
    })
  )
}
