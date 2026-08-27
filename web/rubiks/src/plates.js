import * as THREE from 'three'

/**
 * Plate artwork.
 *
 * Every facelet is drawn to its own 256px canvas rather than sharing one
 * texture per colour: each plate carries its face motif *and* its own serial
 * (`R-04`, `U-07`), so a turn visibly shuffles individual pieces around and not
 * just blocks of colour. 54 textures at 256² is ~14 MB of VRAM — cheap enough
 * that the identity is worth more than the sharing.
 *
 * Nothing is loaded: the whole cube ships as code.
 */

export const FACES = ['U', 'D', 'F', 'B', 'R', 'L']

export const FACE_SPEC = {
  U: { color: '#f2f4f6', ink: '#0f1216', motif: 'grid', name: 'GRID' },
  D: { color: '#f0b429', ink: '#3a2603', motif: 'halftone', name: 'HALFTONE' },
  F: { color: '#2fb673', ink: '#062418', motif: 'circuit', name: 'CIRCUIT' },
  B: { color: '#2b7fe0', ink: '#04162e', motif: 'wave', name: 'WAVE' },
  R: { color: '#e8402a', ink: '#2c0703', motif: 'rays', name: 'RAYS' },
  L: { color: '#ef7a1a', ink: '#331402', motif: 'rings', name: 'RINGS' },
}

const SIZE = 256

/** Deterministic RNG so a reload redraws the same plates. */
function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function roundedPath(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

const MOTIF = {
  /** Engineering paper: fine rules, a crosshair, corner brackets. */
  grid(ctx, ink, rnd) {
    ctx.strokeStyle = ink
    ctx.lineWidth = 1
    ctx.globalAlpha = 0.14
    for (let i = 1; i < 8; i++) {
      const p = (i / 8) * SIZE
      ctx.beginPath(); ctx.moveTo(p, 16); ctx.lineTo(p, SIZE - 16); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(16, p); ctx.lineTo(SIZE - 16, p); ctx.stroke()
    }
    ctx.globalAlpha = 0.5
    ctx.lineWidth = 2
    const c = SIZE / 2
    ctx.beginPath(); ctx.moveTo(c - 26, c); ctx.lineTo(c + 26, c); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(c, c - 26); ctx.lineTo(c, c + 26); ctx.stroke()
    ctx.beginPath(); ctx.arc(c, c, 15, 0, Math.PI * 2); ctx.stroke()
    ctx.globalAlpha = 0.35
    for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const x = sx > 0 ? 26 : SIZE - 26
      const y = sy > 0 ? 26 : SIZE - 26
      ctx.beginPath()
      ctx.moveTo(x + sx * 22, y); ctx.lineTo(x, y); ctx.lineTo(x, y + sy * 22)
      ctx.stroke()
    }
    ctx.globalAlpha = 0.25
    ctx.fillRect(SIZE - 58, SIZE - 34, 4 + rnd() * 20, 4)
  },

  /** Dot matrix that thins toward one corner. */
  halftone(ctx, ink, rnd) {
    ctx.fillStyle = ink
    const n = 11
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const px = 20 + (x / (n - 1)) * (SIZE - 40)
        const py = 20 + (y / (n - 1)) * (SIZE - 40)
        const d = Math.hypot(px - SIZE * 0.28, py - SIZE * 0.24) / SIZE
        const r = Math.max(0, 7.5 * (0.22 + d) - 1.4)
        ctx.globalAlpha = 0.16 + d * 0.5
        ctx.beginPath(); ctx.arc(px, py, r * (0.85 + rnd() * 0.3), 0, Math.PI * 2); ctx.fill()
      }
    }
  },

  /** Traces and pads, routed on a coarse lattice. */
  circuit(ctx, ink, rnd) {
    ctx.strokeStyle = ink
    ctx.fillStyle = ink
    ctx.lineWidth = 3
    ctx.lineCap = 'square'
    ctx.lineJoin = 'miter'
    const step = 32
    for (let i = 0; i < 7; i++) {
      let x = 32 + Math.floor(rnd() * 6) * step
      let y = 32 + Math.floor(rnd() * 6) * step
      ctx.globalAlpha = 0.22 + rnd() * 0.3
      ctx.beginPath()
      ctx.moveTo(x, y)
      for (let s = 0; s < 3; s++) {
        if (rnd() > 0.5) x += (rnd() > 0.5 ? 1 : -1) * step * (1 + Math.floor(rnd() * 2))
        else y += (rnd() > 0.5 ? 1 : -1) * step * (1 + Math.floor(rnd() * 2))
        x = Math.max(24, Math.min(SIZE - 24, x))
        y = Math.max(24, Math.min(SIZE - 24, y))
        ctx.lineTo(x, y)
      }
      ctx.stroke()
      ctx.globalAlpha = 0.5
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill()
      ctx.globalAlpha = 0.9
      ctx.save()
      ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
    }
    ctx.globalAlpha = 0.3
    ctx.lineWidth = 2
    ctx.strokeRect(18, 18, SIZE - 36, SIZE - 36)
  },

  /** Stacked sine bands, like a scope trace. */
  wave(ctx, ink, rnd) {
    ctx.strokeStyle = ink
    ctx.lineWidth = 3
    const phase = rnd() * Math.PI * 2
    for (let b = 0; b < 5; b++) {
      ctx.globalAlpha = 0.16 + b * 0.09
      const y0 = 44 + b * 42
      const amp = 9 + b * 2.2
      ctx.beginPath()
      for (let x = 18; x <= SIZE - 18; x += 4) {
        const y = y0 + Math.sin((x / SIZE) * Math.PI * 4 + phase + b * 0.7) * amp
        if (x === 18) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
  },

  /** Sunburst wedges off centre. */
  rays(ctx, ink, rnd) {
    ctx.fillStyle = ink
    const c = SIZE / 2
    const n = 18
    const spin = rnd() * 0.4
    for (let i = 0; i < n; i++) {
      if (i % 2) continue
      const a0 = (i / n) * Math.PI * 2 + spin
      const a1 = ((i + 1) / n) * Math.PI * 2 + spin
      ctx.globalAlpha = 0.2
      ctx.beginPath()
      ctx.moveTo(c, c)
      ctx.arc(c, c, SIZE * 0.72, a0, a1)
      ctx.closePath()
      ctx.fill()
    }
    ctx.globalAlpha = 0.55
    ctx.beginPath(); ctx.arc(c, c, 22, 0, Math.PI * 2); ctx.fill()
    ctx.save()
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath(); ctx.arc(c, c, 13, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  },

  /** Concentric target with tick marks. */
  rings(ctx, ink, rnd) {
    ctx.strokeStyle = ink
    const c = SIZE / 2
    for (let i = 1; i <= 5; i++) {
      ctx.globalAlpha = 0.16 + i * 0.06
      ctx.lineWidth = i === 3 ? 4 : 2
      ctx.beginPath(); ctx.arc(c, c, i * 21, 0, Math.PI * 2); ctx.stroke()
    }
    ctx.globalAlpha = 0.4
    ctx.lineWidth = 2
    const off = rnd() * 0.3
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2 + off
      const r0 = i % 6 === 0 ? 108 : 116
      ctx.beginPath()
      ctx.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0)
      ctx.lineTo(c + Math.cos(a) * 124, c + Math.sin(a) * 124)
      ctx.stroke()
    }
  },
}

/**
 * One facelet plate. `index` 0..8 is its position on the solved face, used for
 * the serial and to seed the motif so no two plates draw identically.
 */
export function drawPlate(canvas, face, index) {
  const spec = FACE_SPEC[face]
  const ctx = canvas.getContext('2d')
  const rnd = mulberry32(face.charCodeAt(0) * 977 + index * 131 + 7)

  canvas.width = canvas.height = SIZE
  ctx.clearRect(0, 0, SIZE, SIZE)

  // Base: the face colour, lifted at the top so the plate reads as moulded.
  const g = ctx.createLinearGradient(0, 0, SIZE * 0.4, SIZE)
  g.addColorStop(0, spec.color)
  g.addColorStop(1, shade(spec.color, -0.12))
  ctx.fillStyle = g
  roundedPath(ctx, 0, 0, SIZE, SIZE, 34)
  ctx.fill()

  ctx.save()
  roundedPath(ctx, 0, 0, SIZE, SIZE, 34)
  ctx.clip()

  MOTIF[spec.motif](ctx, spec.ink, rnd)
  ctx.globalAlpha = 1

  // Speckle: keeps large flat areas from banding under the studio lights.
  ctx.fillStyle = spec.ink
  for (let i = 0; i < 320; i++) {
    ctx.globalAlpha = rnd() * 0.05
    ctx.fillRect(rnd() * SIZE, rnd() * SIZE, 2, 2)
  }

  // Serial + face letter, bottom edge.
  ctx.globalAlpha = 0.62
  ctx.fillStyle = spec.ink
  ctx.font = '600 20px ui-monospace, Menlo, monospace'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(`${face}-${String(index).padStart(2, '0')}`, 22, SIZE - 22)
  ctx.globalAlpha = 0.34
  ctx.font = '600 14px ui-monospace, Menlo, monospace'
  const tag = `${spec.motif.slice(0, 3).toUpperCase()}·${(rnd() * 900 + 100).toFixed(0)}`
  ctx.fillText(tag, 22, 34)

  // Inner rule.
  ctx.globalAlpha = 0.3
  ctx.strokeStyle = spec.ink
  ctx.lineWidth = 3
  roundedPath(ctx, 10, 10, SIZE - 20, SIZE - 20, 26)
  ctx.stroke()

  ctx.restore()
  return canvas
}

export function plateTexture(face, index) {
  const tex = new THREE.CanvasTexture(drawPlate(document.createElement('canvas'), face, index))
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.max(0, Math.min(255, Math.round(v + (amt < 0 ? v : 255 - v) * amt)))
  )
  return `rgb(${ch[0]},${ch[1]},${ch[2]})`
}
