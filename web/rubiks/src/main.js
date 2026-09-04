import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import './style.css'
import { Cube, FACE_LETTERS, formatMove, invertMove, parseAlgStrict } from './cube.js'
import { Studio } from './studio.js'
import { Director, SCRAMBLE_DEPTH } from './autoplay.js'
import { NetMap, buildLegend, drawQueue } from './hud.js'

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

const state = {
  speed: reduced ? 0.6 : 1.15,
  autocam: !reduced,
  flash: 0,
  idleSince: performance.now(),
}

const canvas = document.getElementById('scene')
const view = document.getElementById('viewport')

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
renderer.setClearColor(0x000000, 0)
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.06
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 120)
camera.position.set(5.6, 4.6, 7.2)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.08
controls.enablePan = false
controls.minDistance = 5
controls.maxDistance = 22
controls.autoRotateSpeed = 0.55
controls.addEventListener('start', () => { state.idleSince = Infinity })
controls.addEventListener('end', () => { state.idleSince = performance.now() })

new Studio(scene, renderer)

const cube = new Cube()
scene.add(cube.group)

const director = new Director()
const net = new NetMap(document.getElementById('cv-net'))
buildLegend(document.getElementById('legend'))

const el = (id) => document.getElementById(id)
const ui = {
  state: el('tb-state'), turns: el('tb-turns'), tps: el('tb-tps'), clock: el('tb-clock'),
  phName: el('ph-name'), phNote: el('ph-note'), phBar: el('ph-bar'),
  queue: el('queue'), log: el('log'),
  moveN: el('vp-move-n'), moveL: el('vp-move-l'), mode: el('pb-mode'),
  routine: el('t-routine'), left: el('t-left'), correct: el('t-correct'),
  faces: el('t-faces'), turn: el('t-turn'), depth: el('t-depth'), cycles: el('t-cycles'),
}

// ── Controls ────────────────────────────────────────────────────────────────
const btnAuto = el('btn-auto')
const btnCam = el('btn-cam')

btnAuto.onclick = () => {
  director.enabled = !director.enabled
  btnAuto.classList.toggle('active', director.enabled)
  if (director.enabled) director.rest = 0.15
  else dismissTakeover() // found the controls — the invite has done its job
}
el('btn-scramble').onclick = () => director.scrambleNow()
el('btn-retrace').onclick = () => director.retraceNow()
el('btn-pattern').onclick = () => director.patternNow()
el('btn-reset').onclick = () => {
  cube.reset()
  director.queue = []
  director.manualQueue = []
  director.history = []
  played.length = 0
  director.beat = 'scramble'
  director.rest = 1.2
  director.phase = { label: 'RESET', note: 'cube returned to solved', total: 0, done: 0 }
  onSettled(null)
}
el('btn-cam').onclick = () => {
  state.autocam = !state.autocam
  btnCam.classList.toggle('active', state.autocam)
}
btnCam.classList.toggle('active', state.autocam)

const speedInput = el('in-speed')
speedInput.value = String(state.speed)
speedInput.oninput = () => {
  state.speed = Number(speedInput.value)
  el('lb-speed').textContent = `${state.speed.toFixed(2)}×`
}
el('lb-speed').textContent = `${state.speed.toFixed(2)}×`

addEventListener('keydown', (e) => {
  const t = e.target
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
  if (e.ctrlKey || e.metaKey) return
  if (e.code === 'Space') { e.preventDefault(); btnAuto.click(); return }
  // Face keys turn the cube: plain is clockwise, shift adds the prime.
  // (`r` used to mean retrace — it is a face now, so retrace moved to `t`.)
  const k = e.key.length === 1 ? e.key.toUpperCase() : ''
  if (k && FACE_LETTERS.includes(k)) { playManual({ face: k, amount: e.shiftKey ? -1 : 1 }); return }
  if (e.key === 's' || e.key === 'S') el('btn-scramble').click()
  else if (e.key === 't' || e.key === 'T') el('btn-retrace').click()
  else if (e.key === 'p' || e.key === 'P') el('btn-pattern').click()
  else if (e.key === 'z' || e.key === 'Z') el('btn-undo').click()
})

// ── Manual play ─────────────────────────────────────────────────────────────
/** Queue user moves: takes over from autoplay and syncs its button. */
function playManual(moves) {
  const queued = director.manual(moves)
  if (queued.length) {
    btnAuto.classList.toggle('active', director.enabled)
    dismissTakeover()
  }
  return queued
}

let takeoverShown = true
function dismissTakeover() {
  if (!takeoverShown) return
  takeoverShown = false
  el('vp-takeover').classList.add('hide')
}

const SUFFIXES = [
  { suffix: '', amount: 1, label: (f) => f },
  { suffix: "'", amount: -1, label: (f) => `${f}'` },
  { suffix: '2', amount: 2, label: (f) => `${f}2` },
]
const pad = el('pad')
for (const face of FACE_LETTERS) {
  const group = document.createElement('div')
  group.className = 'pad-group'
  group.dataset.face = face
  for (const s of SUFFIXES) {
    const b = document.createElement('button')
    b.textContent = s.label(face)
    b.title = `${s.label(face)} — turn ${face}${s.suffix === "'" ? ' counter-clockwise' : s.suffix === '2' ? ' twice' : ' clockwise'}`
    b.onclick = () => playManual({ face, amount: s.amount })
    group.append(b)
  }
  pad.append(group)
}

const algInput = el('in-alg')
function submitAlg() {
  const moves = parseAlgStrict(algInput.value)
  if (!moves.length) {
    algInput.classList.add('bad')
    setTimeout(() => algInput.classList.remove('bad'), 600)
    return
  }
  playManual(moves)
  algInput.value = ''
  algInput.blur()
}
el('btn-alg').onclick = submitAlg
algInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') submitAlg()
  else if (e.key === 'Escape') algInput.blur()
})
el('btn-undo').onclick = () => {
  const last = played.pop()
  if (last) playManual(invertMove(last))
}

// ── Turn bookkeeping ────────────────────────────────────────────────────────
const recent = [] // completion timestamps, for the turns-per-second readout
const logLines = []
const played = [] // settled moves, newest last — the undo stack

function onSettled(move) {
  const facelets = cube.readFacelets()
  const score = cube.score(facelets)
  net.draw(facelets)

  if (move) {
    played.push(move)
    if (played.length > 400) played.splice(0, played.length - 400)
    recent.push(performance.now())
    logLines.unshift(`${String(cube.turns).padStart(3, '0')} <b>${formatMove(move)}</b> · ${score.correct}/54`)
    logLines.length = Math.min(logLines.length, 9)
    ui.log.innerHTML = logLines.map((l) => `<div>${l}</div>`).join('')
  }

  ui.state.textContent = score.solved ? 'SOLVED' : `${score.faces} FACE${score.faces === 1 ? '' : 'S'}`
  ui.state.style.color = score.solved ? 'var(--accent)' : ''
  ui.correct.textContent = `${score.correct} / 54`
  ui.faces.textContent = `${score.faces} / 6`

  if (score.solved && move) state.flash = 1
}

/** Plates glow up for a moment when the cube lands solved. */
function applyFlash() {
  const v = 0.07 + state.flash * 0.45
  for (const { mesh } of cube.stickers) mesh.material.emissiveIntensity = v
}

// ── Loop ────────────────────────────────────────────────────────────────────
const clock = new THREE.Clock()
const started = performance.now()
let hudAccum = 0

function frame() {
  requestAnimationFrame(frame)
  const dt = Math.min(0.05, clock.getDelta())
  const now = performance.now()

  const duration = 0.3 / state.speed
  const started_ = director.tick(dt, cube, duration)
  if (started_) {
    ui.moveN.textContent = formatMove(started_)
    ui.moveL.textContent = director.phase.label.toLowerCase()
  }

  const landed = cube.update(dt)
  if (landed) onSettled(landed)

  if (state.flash > 0) {
    state.flash = Math.max(0, state.flash - dt * 1.1)
    applyFlash()
  }

  controls.autoRotate = state.autocam && now - state.idleSince > 2200
  controls.update()
  renderer.render(scene, camera)

  hudAccum += dt
  if (hudAccum > 0.1) { hudAccum = 0; paintHud(now, duration) }
}

function paintHud(now, duration) {
  const p = director.phase
  ui.phName.textContent = p.label
  ui.phNote.textContent = p.note
  ui.phBar.style.width = p.total ? `${(p.done / p.total) * 100}%` : '0%'

  drawQueue(ui.queue, director.preview(23), cube.busy ? formatMove(cube.active.move) : null)

  while (recent.length && now - recent[0] > 4000) recent.shift()
  ui.tps.textContent = (recent.length / 4).toFixed(1)
  ui.turns.textContent = String(cube.turns)

  const secs = ((now - started) / 1000) | 0
  ui.clock.textContent = `${String((secs / 60) | 0).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`

  if (p.label === 'MANUAL') { ui.mode.textContent = 'YOU PLAY'; ui.mode.dataset.s = 'manual' }
  else if (director.enabled) { ui.mode.textContent = 'AUTOPLAY'; ui.mode.dataset.s = 'auto' }
  else { ui.mode.textContent = 'HELD'; ui.mode.dataset.s = 'held' }

  ui.routine.textContent = p.label.replace('PATTERN · ', '')
  ui.left.textContent = String(director.queue.length + director.manualQueue.length)
  ui.turn.textContent = `${(duration * 1000) | 0} ms`
  ui.depth.textContent = `${SCRAMBLE_DEPTH} moves`
  ui.cycles.textContent = String(director.cycles)

  if (!cube.busy && director.idle) {
    ui.moveN.textContent = '—'
    ui.moveL.textContent = director.enabled ? 'holding' : 'paused'
  }
}

// ── Layout ──────────────────────────────────────────────────────────────────
function resize() {
  const r = view.getBoundingClientRect()
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
  renderer.setSize(r.width, r.height, false)
  camera.aspect = r.width / Math.max(1, r.height)
  camera.updateProjectionMatrix()
  net.resize()
}
new ResizeObserver(resize).observe(view)
resize()

onSettled(null)
frame()
