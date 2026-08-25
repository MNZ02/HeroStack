import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import './style.css'
import { JellyBot } from './jellybot.js'
import { Studio } from './studio.js'
import { HUD } from './hud.js'

const SHAPE_K = 3.0
const YIELD_MPA = 520
const MODULUS_GPA = 340

const state = {
  depth: 250,
  pulseRate: 0.8,
  exploded: false,
  autocam: true,
  focus: null,
  ballast: 0,
  pump: 2,
  bus: 48.4,
}

const canvas = document.getElementById('scene')
const view = document.getElementById('viewport')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
renderer.setClearColor(0x000000, 0)
renderer.toneMapping = THREE.NoToneMapping
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
camera.position.set(5.2, 0.6, 8.0)

const controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(0, -1.0, 0)
controls.enableDamping = true
controls.dampingFactor = 0.08
controls.minDistance = 2.2
controls.maxDistance = 18
controls.enabled = false

new Studio(scene)
const bot = new JellyBot(scene)

const SHOTS = [
  { p: [4.6, 1.2, 6.8], t: [0, -0.7, 0], name: 'ORBITAL INSPECTION' },
  { p: [2.2, -3.0, 3.4], t: [0, -2.7, 0], name: 'LIMB ARRAY' },
  { p: [0.8, 7.0, 1.2], t: [0, -0.5, 0], name: 'PLAN VIEW' },
  { p: [1.8, -0.6, 2.6], t: [0, -0.9, 0], name: 'SPINE DETAIL' },
  { p: [6.4, 2.8, 8.2], t: [0, 0, 0], name: 'ASSEMBLY WIDE' },
]

const FOCUS = {
  dome: {
    name: 'NEURAL DOME',
    p: [2.4, 1.6, 2.8], t: [0, 0.6, 0],
    xe: { p: [4.4, 2.9, 5.4], t: [0, 1.2, 0] },
  },
  spine: {
    name: 'UTILITY SPINE',
    p: [1.9, -0.9, 2.6], t: [0, -1.0, 0],
    xe: { p: [2.6, -0.6, 3.4], t: [0, -1.0, 0] },
  },
  limb: {
    name: 'PROPULSOR LIMB',
    p: [2.4, -2.9, 3.4], t: [0, -2.7, 0],
    xe: { p: [2.8, -2.6, 3.9], t: [0, -2.7, 0] },
  },
}
let shotI = 0
let shotT = 0
const UPV = new THREE.Vector3(0, 1, 0)
const offV = new THREE.Vector3()
const desP = new THREE.Vector3()
const desT = new THREE.Vector3()

const hud = new HUD({
  onComponent: id => {
    state.focus = state.focus === id ? null : id
    hud.setComponentUi(state.focus)
  },
  onExplode: () => {
    state.exploded = !state.exploded
    bot.setExploded(state.exploded)
    hud.setExplodeUi(state.exploded)
    if (state.exploded && state.autocam && !state.focus) { shotI = 4; shotT = 0 }
  },
  onAutocam: () => {
    state.autocam = !state.autocam
    controls.enabled = !state.autocam
    hud.setAutocamUi(state.autocam)
  },
})

canvas.addEventListener('pointerdown', () => {
  if (state.autocam) {
    state.autocam = false
    controls.enabled = true
    hud.setAutocamUi(false)
  }
})

const params = new URLSearchParams(location.search)
if (params.has('explode')) {
  state.exploded = true
  bot.setExploded(true)
  hud.setExplodeUi(true)
  shotI = 4
}
if (params.has('shot')) shotI = Number(params.get('shot')) % SHOTS.length
camera.position.set(...SHOTS[shotI].p)
controls.target.set(...SHOTS[shotI].t)

function resize() {
  const w = view.clientWidth
  const h = view.clientHeight
  if (w === 0 || h === 0) return
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.setSize(w, h, false)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  hud.resize()
}
addEventListener('resize', resize)
resize()

const clock = new THREE.Clock()

function tick() {
  requestAnimationFrame(tick)
  const dt = Math.min(clock.getDelta(), 0.05)
  const t = clock.elapsedTime

  state.depth = 250 + 9 * Math.sin(t * 0.045)
  const depth = state.depth

  state.ballast = 0.05 * Math.sin(t * 0.11)
  state.pump += (2.4 + Math.sin(t * 0.19) - state.pump) * Math.min(1, dt * 2)
  state.bus += (48.4 - state.pump * 0.02 - state.bus) * Math.min(1, dt * 2)

  const atm = 1 + depth / 10.06
  const mpa = atm * 0.101325
  const stress = mpa * SHAPE_K
  const strainUE = (stress / (MODULUS_GPA * 1000)) * 1e6
  const margin = Math.max(0, 100 * (1 - stress / YIELD_MPA))
  const uplink = Math.max(0.2, 14.5 * (1 - depth / 11600)) * (0.955 + 0.045 * Math.sin(t * 1.3))

  bot.update(dt, 0.78 + 0.06 * Math.sin(t * 0.07))

  let S
  if (state.focus) {
    const F = FOCUS[state.focus]
    S = state.exploded && F.xe ? { ...F.xe, name: F.name } : { p: F.p, t: F.t, name: F.name }
  } else {
    S = SHOTS[shotI]
  }

  if (state.autocam) {
    if (!state.focus) {
      shotT += dt
      if (shotT > 7.5) {
        shotT = 0
        shotI = state.exploded ? 4 : (shotI + 1) % SHOTS.length
        S = SHOTS[shotI]
      }
    }
    const a = t * 0.06 + shotI * 1.3
    offV.set(S.p[0] - S.t[0], S.p[1] - S.t[1], S.p[2] - S.t[2])
    offV.applyAxisAngle(UPV, a)
    desT.set(S.t[0], S.t[1], S.t[2])
    desP.copy(desT).add(offV)
    const f = 1 - Math.exp(-dt * 2.2)
    camera.position.lerp(desP, f)
    controls.target.lerp(desT, f)
    camera.lookAt(controls.target)
    hud.ui.vpCam.textContent = state.focus
      ? `FOCUS // ${S.name}`
      : `CAM-0${shotI + 1} // ${S.name}`
  } else {
    controls.update()
  }

  hud.update({
    t,
    dt,
    depth,
    mode: state.focus ? FOCUS[state.focus].name : 'STATION-KEEPING',
    camera,
    bot,
    ballast: state.ballast,
    pump: state.pump,
    bus: state.bus,
    atm,
    mpa,
    stress,
    strainUE,
    margin,
    uplink,
  })

  renderer.render(scene, camera)
}
tick()
