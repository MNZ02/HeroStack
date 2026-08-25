import * as THREE from 'three'

const INK = '#26251d'
const INK2 = '#8b8672'
const RED = '#c2312b'
const GRID = 'rgba(38,37,29,0.16)'
const GRID_SOFT = 'rgba(38,37,29,0.08)'

const MONO = 'ui-monospace, Menlo, Consolas, monospace'

function chart(id) {
  const cvs = document.getElementById(id)
  return { cvs, ctx: cvs.getContext('2d'), w: 0, h: 0 }
}

function fit(ch) {
  const r = ch.cvs.getBoundingClientRect()
  if (r.width === 0 || r.height === 0) return
  const d = Math.min(devicePixelRatio || 1, 2)
  ch.w = r.width
  ch.h = r.height
  ch.cvs.width = Math.round(r.width * d)
  ch.cvs.height = Math.round(r.height * d)
  ch.ctx.setTransform(d, 0, 0, d, 0, 0)
}

function fmtCoord(lat, lon, t) {
  const la = 6.7369 + 0.0004 * Math.sin(t * 0.013)
  const lo = 121.0461 + 0.0006 * Math.cos(t * 0.011)
  const ddm = v => {
    const d = Math.floor(v)
    const m = ((v - d) * 60).toFixed(2).padStart(5, '0')
    return `${String(d).padStart(2, '0')}°${m}'`
  }
  return `N ${ddm(la)} · W ${ddm(lo)}`
}

function tempAt(d) {
  if (d < 100) return 22 - 4 * (d / 100)
  if (d < 1000) return 18 - 14 * ((d - 100) / 900)
  return Math.max(1.1, 4 - 2.9 * Math.min((d - 1000) / 3500, 1))
}

function salAt(d, t) {
  return 34.45 + 0.26 * (1 - Math.exp(-d / 700)) + 0.008 * Math.sin(t * 0.35)
}

export class HUD {
  constructor({ onExplode, onAutocam, onComponent }) {
    this.scope = chart('cv-scope')
    this.morph = chart('cv-morph')
    this.bars = chart('cv-bars')
    this.gauge = chart('cv-gauge')
    this.hist = chart('cv-hist')
    this.overlay = chart('overlay')

    this.scopeBuf = Array.from({ length: 240 }, () => 0)
    this.histBuf = Array.from({ length: 240 }, () => NaN)
    this.histAcc = 0
    this.needle = 0
    this.ledDur = ''

    this.el = id => document.getElementById(id)
    this.ui = {
      clock: this.el('tb-clock'),
      coord: this.el('tb-coord'),
      sys: this.el('tb-sys'),
      vpCoord: this.el('vp-coord'),
      vpTime: this.el('vp-time'),
      vpCam: this.el('vp-cam'),
      mode: this.el('bb-mode'),
      stress: this.el('bb-stress'),
      strain: this.el('bb-strain'),
      mpa: this.el('t-mpa'),
      temp: this.el('t-temp'),
      sal: this.el('t-sal'),
      bal: this.el('t-bal'),
      pump: this.el('t-pump'),
      pwr: this.el('t-pwr'),
      link: this.el('t-link'),
      margin: this.el('t-margin'),
      zone: this.el('t-zone'),
    }
    this.leds = [...document.querySelectorAll('.leds i.r')]

    this.compButtons = [...document.querySelectorAll('[data-comp]')]
    for (const b of this.compButtons) {
      b.addEventListener('click', () => onComponent(b.dataset.comp))
    }
    this.btnExplode = this.el('btn-explode')
    this.btnExplode.addEventListener('click', () => onExplode())
    this.btnAuto = this.el('btn-autocam')
    this.btnAuto.addEventListener('click', () => onAutocam())

    addEventListener('keydown', e => {
      if (e.repeat) return
      const k = e.key.toLowerCase()
      if (k === '1') this.compButtons[0]?.click()
      else if (k === '2') this.compButtons[1]?.click()
      else if (k === '3') this.compButtons[2]?.click()
      else if (k === 'escape' || k === '0') {
        const active = this.compButtons.find(b => b.classList.contains('active'))
        if (active) active.click()
      }
      else if (k === 'x') this.btnExplode.click()
      else if (k === 'c') this.btnAuto.click()
    })

    this.resize()
  }

  setAutocamUi(on) {
    this.btnAuto.classList.toggle('active', on)
  }

  setExplodeUi(on) {
    this.btnExplode.classList.toggle('active', on)
  }

  setComponentUi(id) {
    for (const b of this.compButtons) {
      b.classList.toggle('active', b.dataset.comp === id)
    }
  }

  resize() {
    for (const ch of [this.scope, this.morph, this.bars, this.gauge, this.hist, this.overlay]) fit(ch)
  }

  update(sim) {
    const { t, dt, depth, camera, bot } = sim
    const zone =
      depth <= 200 ? 'EPIPELAGIC'
      : depth <= 1000 ? 'MESOPELAGIC'
      : depth <= 4000 ? 'BATHYPELAGIC'
      : depth <= 6000 ? 'ABYSSOPELAGIC'
      : 'HADALPELAGIC'

    this.scopeBuf.shift()
    this.scopeBuf.push(sim.strainUE + (Math.random() - 0.5) * 0.8)

    this.histAcc += dt
    while (this.histAcc >= 0.5) {
      this.histAcc -= 0.5
      this.histBuf.shift()
      this.histBuf.push(depth)
    }

    this.needle += (depth - this.needle) * Math.min(1, dt * 2.2)

    this.drawScope()
    this.drawMorph(bot)
    this.drawBars(bot.loads)
    this.drawGauge(this.needle)
    this.drawHist()
    this.drawOverlay(camera, bot)

    const now = new Date()
    const p2 = n => String(n).padStart(2, '0')
    this.ui.clock.textContent = `${p2(now.getUTCHours())}:${p2(now.getUTCMinutes())}:${p2(now.getUTCSeconds())}`
    const coord = fmtCoord(0, 0, t)
    this.ui.coord.textContent = coord
    this.ui.vpCoord.textContent = `FIX ${coord}`
    const el = Math.floor(t)
    this.ui.vpTime.textContent = `T+${p2(Math.floor(el / 3600))}:${p2(Math.floor(el / 60) % 60)}:${p2(el % 60)}`

    this.ui.mode.textContent = sim.mode
    this.ui.sys.textContent = sim.margin < 40 ? 'LOADED' : 'NOMINAL'
    this.ui.stress.textContent = `${sim.stress.toFixed(1)} MPa`
    this.ui.strain.textContent = `· ${sim.strainUE.toFixed(0)} µε`
    this.ui.mpa.textContent = `${sim.mpa.toFixed(2)} MPa / ${Math.round(sim.atm).toLocaleString('en-US')} atm`
    this.ui.temp.textContent = `${tempAt(depth).toFixed(1)} °C`
    this.ui.sal.textContent = `${salAt(depth, t).toFixed(2)} PSU`
    this.ui.bal.textContent = `${sim.ballast >= 0 ? '+' : ''}${sim.ballast.toFixed(2)} kg`
    this.ui.pump.textContent = `${Math.round(sim.pump)} %`
    this.ui.pwr.textContent = `${sim.bus.toFixed(1)} V`
    this.ui.link.textContent = `${sim.uplink.toFixed(1)} kb/s`
    this.ui.margin.textContent = `${sim.margin.toFixed(1)} %`
    this.ui.zone.textContent = zone

    const dur = `${(0.45 + 1.1 * (1 - bot.deform.exhaust)).toFixed(2)}s`
    if (dur !== this.ledDur) {
      this.ledDur = dur
      for (const led of this.leds) led.style.animationDuration = dur
    }
  }

  drawScope() {
    const { ctx, w, h } = this.scope
    ctx.clearRect(0, 0, w, h)
    const fs = Math.max(50, ...this.scopeBuf.map(v => Math.abs(v))) * 1.25

    ctx.strokeStyle = GRID_SOFT
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = 0; x <= w; x += 24) { ctx.moveTo(x, 0); ctx.lineTo(x, h) }
    for (const f of [0.25, 0.5, 0.75]) { ctx.moveTo(0, h * f); ctx.lineTo(w, h * f) }
    ctx.stroke()

    ctx.strokeStyle = INK
    ctx.lineWidth = 1.2
    ctx.beginPath()
    const n = this.scopeBuf.length
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * w
      const y = h - 4 - (Math.max(0, this.scopeBuf[i]) / fs) * (h - 12)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    const ly = h - 4 - (Math.max(0, this.scopeBuf[n - 1]) / fs) * (h - 12)
    ctx.fillStyle = RED
    ctx.beginPath()
    ctx.arc(w - 1.5, ly, 2, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = INK2
    ctx.font = `7px ${MONO}`
    ctx.textAlign = 'left'
    ctx.fillText(`${Math.round(fs)} µε FS`, 2, 8)
  }

  drawMorph(bot) {
    const { ctx, w, h } = this.morph
    ctx.clearRect(0, 0, w, h)
    const cx = w / 2
    const cy = h / 2
    const R0 = Math.min(w, h) * 0.36
    const phase = bot.phase
    const a2 = bot.deform.sq * 1.3
    const a3 = bot.deform.exhaust * 0.22
    const a5 = 0.03 + 0.05 * bot.deform.exhaust

    ctx.strokeStyle = GRID
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + Math.cos(a) * R0 * 1.15, cy + Math.sin(a) * R0 * 1.15)
    }
    ctx.stroke()

    const rings = [0.45, 0.7, 0.95]
    rings.forEach((ring, k) => {
      ctx.strokeStyle = k === 1 ? RED : INK2
      ctx.globalAlpha = k === 1 ? 1 : 0.55
      ctx.lineWidth = k === 1 ? 1.4 : 1
      ctx.beginPath()
      for (let i = 0; i <= 128; i++) {
        const th = (i / 128) * Math.PI * 2
        const r =
          ring *
          (1 + a2 * Math.sin(2 * th + phase * 1.1) + a3 * Math.sin(3 * th - phase * 1.6) + a5 * Math.sin(5 * th + phase * 0.6))
        const x = cx + Math.cos(th) * r * R0
        const y = cy + Math.sin(th) * r * R0
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.stroke()
    })
    ctx.globalAlpha = 1

    ctx.fillStyle = INK
    ctx.fillRect(cx - 3, cy - 0.5, 6, 1)
    ctx.fillRect(cx - 0.5, cy - 3, 1, 6)
  }

  drawBars(loads) {
    const { ctx, w, h } = this.bars
    ctx.clearRect(0, 0, w, h)
    const n = loads.length
    const slot = (w - 8) / n
    const bw = slot * 0.58
    let maxI = 0
    loads.forEach((v, i) => { if (v > loads[maxI]) maxI = i })

    ctx.strokeStyle = GRID_SOFT
    ctx.beginPath()
    for (let i = 0; i <= 4; i++) {
      const y = 4 + ((h - 10) * i) / 4
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
    }
    ctx.stroke()

    for (let i = 0; i < n; i++) {
      const bh = loads[i] * (h - 12)
      ctx.fillStyle = i === maxI ? RED : INK
      ctx.fillRect(4 + i * slot + (slot - bw) / 2, h - 4 - bh, bw, bh)
    }
    ctx.strokeStyle = INK
    ctx.beginPath()
    ctx.moveTo(0, h - 3.5)
    ctx.lineTo(w, h - 3.5)
    ctx.stroke()
  }

  drawGauge(depth) {
    const { ctx, w, h } = this.gauge
    ctx.clearRect(0, 0, w, h)
    const cx = w / 2
    const cy = h * 0.54
    const R = Math.min(w * 0.4, h * 0.66)
    const a0 = Math.PI * 0.75
    const a1 = Math.PI * 2.25
    const MAXD = 12000
    const OP_LIMIT = 11000
    const ang = d => a0 + (Math.min(d, MAXD) / MAXD) * (a1 - a0)

    ctx.lineWidth = 3
    ctx.strokeStyle = GRID
    ctx.beginPath()
    ctx.arc(cx, cy, R, a0, a1)
    ctx.stroke()

    ctx.strokeStyle = RED
    ctx.beginPath()
    ctx.arc(cx, cy, R, ang(OP_LIMIT), a1)
    ctx.stroke()

    ctx.lineWidth = 1
    for (let d = 0; d <= MAXD; d += 500) {
      const a = ang(d)
      const major = d % 2000 === 0
      const r1 = R + 3
      const r2 = R + (major ? 11 : 6)
      ctx.strokeStyle = d === 11000 ? RED : major ? INK : INK2
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1)
      ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2)
      ctx.stroke()
      if (major) {
        ctx.fillStyle = INK2
        ctx.font = `7px ${MONO}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const rl = R + 19
        ctx.fillText(String(d / 1000), cx + Math.cos(a) * rl, cy + Math.sin(a) * rl)
      }
    }

    const a = ang(depth)
    ctx.strokeStyle = RED
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(cx - Math.cos(a) * 10, cy - Math.sin(a) * 10)
    ctx.lineTo(cx + Math.cos(a) * (R - 8), cy + Math.sin(a) * (R - 8))
    ctx.stroke()
    ctx.fillStyle = RED
    ctx.beginPath()
    ctx.arc(cx, cy, 3, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = INK
    ctx.font = `bold 11px ${MONO}`
    ctx.textAlign = 'center'
    ctx.fillText(`${Math.round(depth).toLocaleString('en-US')} M`, cx, cy + R * 0.52)
    ctx.fillStyle = INK2
    ctx.font = `7px ${MONO}`
    ctx.fillText('DEPTH // MSL', cx, cy + R * 0.52 + 11)
  }

  drawHist() {
    const { ctx, w, h } = this.hist
    ctx.clearRect(0, 0, w, h)
    const valid = this.histBuf.filter(v => Number.isFinite(v))
    if (valid.length === 0) return
    const n = this.histBuf.length
    const maxD = Math.max(1000, ...valid) * 1.08

    ctx.strokeStyle = GRID_SOFT
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let i = 1; i <= 3; i++) {
      const y = (h * i) / 4
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
    }
    ctx.stroke()

    ctx.strokeStyle = INK
    ctx.lineWidth = 1.2
    ctx.beginPath()
    let started = false
    let lastX = 0
    let lastY = 0
    for (let i = 0; i < n; i++) {
      const v = this.histBuf[i]
      if (!Number.isFinite(v)) continue
      const x = (i / (n - 1)) * w
      const y = h - 3 - (v / maxD) * (h - 8)
      if (!started) { ctx.moveTo(x, y); started = true } else ctx.lineTo(x, y)
      lastX = x
      lastY = y
    }
    ctx.stroke()

    ctx.fillStyle = RED
    ctx.beginPath()
    ctx.arc(lastX, lastY, 2, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = INK2
    ctx.font = `7px ${MONO}`
    ctx.textAlign = 'left'
    ctx.fillText(`${Math.round(maxD)} m`, 2, 8)
  }

  drawOverlay(camera, bot) {
    const { ctx, w, h } = this.overlay
    if (w === 0) return
    ctx.clearRect(0, 0, w, h)
    const cx = w / 2
    const cy = h / 2

    ctx.strokeStyle = 'rgba(38,37,29,0.5)'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      ctx.moveTo(cx + dx * 5, cy + dy * 5)
      ctx.lineTo(cx + dx * 14, cy + dy * 14)
    }
    ctx.stroke()

    ctx.strokeStyle = 'rgba(38,37,29,0.65)'
    const B = 10
    const L = 16
    ctx.beginPath()
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const x = sx > 0 ? w - B : B
      const y = sy > 0 ? h - B : B
      ctx.moveTo(x + sx * L, y)
      ctx.lineTo(x, y)
      ctx.lineTo(x, y + sy * L)
    }
    ctx.stroke()

    const v = new THREE.Vector3()
    ctx.font = `9px ${MONO}`
    ctx.textBaseline = 'middle'
    for (const co of bot.callouts) {
      if (co.obj) co.obj.getWorldPosition(v)
      else bot.group.localToWorld(v.copy(co.local))
      v.project(camera)
      if (v.z > 1) continue
      const x = (v.x * 0.5 + 0.5) * w
      const y = (-v.y * 0.5 + 0.5) * h
      const side = x < cx ? -1 : 1
      const ex = x + side * 26
      const ey = y - 20
      const tx = ex + side * 46

      ctx.strokeStyle = 'rgba(38,37,29,0.75)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(ex, ey)
      ctx.lineTo(tx, ey)
      ctx.stroke()

      ctx.fillStyle = RED
      ctx.beginPath()
      ctx.arc(x, y, 2.2, 0, Math.PI * 2)
      ctx.fill()

      const tw = ctx.measureText(co.label).width
      const lx = side > 0 ? tx + 5 : tx - tw - 10
      ctx.fillStyle = 'rgba(233,229,214,0.92)'
      ctx.fillRect(lx - 2, ey - 7, tw + 8, 14)
      ctx.fillStyle = INK
      ctx.fillText(co.label, lx + 2, ey)
    }
  }
}
