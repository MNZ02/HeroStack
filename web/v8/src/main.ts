import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { createEngine, BANK_ANGLE } from './engine'

const LEVELS = [
  { desc: 'Complete big-block, cross-plane crank, 90° banks. Pull it apart with the buttons below.' },
  { desc: 'Intake manifold and both valve covers lift clear of the heads.' },
  { desc: 'Cylinder heads, exhaust headers and oil pan slide away along their bank axes.' },
  { desc: 'The block ghosts out — watch the short-side internals keep running through it.' },
  { desc: 'Bare rotating assembly: crank throws at 0/90/270/180°, eight rods, full slider-crank motion.' },
]

const canvas = document.getElementById('scene') as HTMLCanvasElement

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.1

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0e1013)
scene.fog = new THREE.Fog(0x0e1013, 14, 34)

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100)
camera.position.set(5.4, 3.1, 6.3)

const controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(0, 0.55, 0)
controls.enableDamping = true
controls.dampingFactor = 0.08
controls.minDistance = 3
controls.maxDistance = 16
controls.maxPolarAngle = Math.PI * 0.55
controls.autoRotateSpeed = 0.9

function studioEnvironment(): THREE.Scene {
  const env = new THREE.Scene()
  env.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(20),
      new THREE.MeshBasicMaterial({ color: 0x0b0c0f, side: THREE.BackSide }),
    ),
  )
  const panel = (
    w: number,
    h: number,
    hex: number,
    intensity: number,
    pos: [number, number, number],
  ) => {
    const p = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(intensity) }),
    )
    p.position.set(...pos)
    p.lookAt(0, 0, 0)
    env.add(p)
  }
  panel(14, 3, 0xffffff, 4, [0, 10, 2])
  panel(8, 8, 0xbfd4ff, 2.4, [-12, 3, 4])
  panel(6, 6, 0xffd9b0, 2.2, [11, 2, -6])
  panel(10, 2, 0xffffff, 1.6, [0, 2, -14])
  return env
}

const pmrem = new THREE.PMREMGenerator(renderer)
scene.environment = pmrem.fromScene(studioEnvironment(), 0.04).texture

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.12,
  0.55,
  0.9,
)
composer.addPass(bloom)
composer.addPass(new OutputPass())

scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x241d15, 0.45))

const key = new THREE.DirectionalLight(0xfff4e8, 1.6)
key.position.set(6, 9, 5)
key.castShadow = true
key.shadow.mapSize.set(2048, 2048)
key.shadow.camera.left = -6
key.shadow.camera.right = 6
key.shadow.camera.top = 6
key.shadow.camera.bottom = -6
key.shadow.camera.near = 0.5
key.shadow.camera.far = 25
key.shadow.bias = -0.0004
scene.add(key)

const rim = new THREE.DirectionalLight(0x88aaff, 0.75)
rim.position.set(-7, 4, -6)
scene.add(rim)

function floorTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(256, 256, 20, 256, 256, 250)
  grad.addColorStop(0, '#30343a')
  grad.addColorStop(0.45, '#181b1f')
  grad.addColorStop(1, '#0c0e11')
  g.fillStyle = grad
  g.fillRect(0, 0, 512, 512)
  return new THREE.CanvasTexture(c)
}

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(9, 64).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({ map: floorTexture(), roughness: 0.9, metalness: 0.05 }),
)
ground.position.y = -1.86
ground.receiveShadow = true
scene.add(ground)

const grid = new THREE.GridHelper(18, 36, 0x30353d, 0x1c2026)
grid.position.y = -1.855
;(grid.material as THREE.Material).transparent = true
;(grid.material as THREE.Material).opacity = 0.35
scene.add(grid)

const engine = createEngine()
scene.add(engine.root)

interface Floater {
  group: THREE.Group
  dir: THREE.Vector3
  dist: number
  offAt: number
  t: number
  fullFade?: boolean
  meltAt?: number
  g?: number
}

const axisL = new THREE.Vector3(-Math.sin(BANK_ANGLE), Math.cos(BANK_ANGLE), 0)
const axisR = new THREE.Vector3(Math.sin(BANK_ANGLE), Math.cos(BANK_ANGLE), 0)
const basePositions = new Map<THREE.Object3D, THREE.Vector3>()

function track(g: THREE.Group): void {
  basePositions.set(g, g.position.clone())
}

track(engine.layers.intake)
track(engine.layers.ignition)
for (const g of engine.layers.covers) track(g)
for (const g of engine.layers.heads) track(g)
track(engine.layers.pan)
track(engine.layers.block)

const floaters: Floater[] = [
  { group: engine.layers.intake, dir: new THREE.Vector3(0, 1, 0), dist: 1.8, offAt: 1, t: 0, meltAt: 3, g: 0 },
  {
    group: engine.layers.ignition,
    dir: new THREE.Vector3(0, 1, -0.5).normalize(),
    dist: 1.1,
    offAt: 2,
    t: 0,
    fullFade: true,
    g: 0,
  },
  { group: engine.layers.covers[0], dir: axisL.clone(), dist: 1.25, offAt: 1, t: 0, meltAt: 3, g: 0 },
  { group: engine.layers.covers[1], dir: axisR.clone(), dist: 1.25, offAt: 1, t: 0, meltAt: 3, g: 0 },
  { group: engine.layers.heads[0], dir: axisL.clone(), dist: 0.85, offAt: 2, t: 0, meltAt: 3, g: 0 },
  { group: engine.layers.heads[1], dir: axisR.clone(), dist: 0.85, offAt: 2, t: 0, meltAt: 3, g: 0 },
  { group: engine.layers.pan, dir: new THREE.Vector3(0, -1, 0), dist: 1.45, offAt: 2, t: 0, meltAt: 3, g: 0 },
]

function setLayerOpacity(group: THREE.Group, opacity: number, ghostDepthWrite = true): void {
  const on = opacity > 0.02
  group.visible = on
  if (!on) return
  for (const child of group.children) {
    child.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined
      if (m && 'opacity' in m) {
        m.opacity = opacity
        m.depthWrite = ghostDepthWrite || opacity > 0.95
      }
    })
  }
}

let level = 0

const layerBtns = Array.from(document.querySelectorAll<HTMLButtonElement>('.layer'))
const descEl = document.getElementById('desc') as HTMLElement

function applyLevel(n: number): void {
  level = n
  layerBtns.forEach((b, i) => b.classList.toggle('active', i === n))
  descEl.textContent = LEVELS[n].desc
}
layerBtns.forEach((b, i) => b.addEventListener('click', () => applyLevel(i)))
applyLevel(0)

const rpmEl = document.getElementById('rpm') as HTMLInputElement
const rpmVal = document.getElementById('rpmVal') as HTMLElement
const spinEl = document.getElementById('spin') as HTMLInputElement
const orbitEl = document.getElementById('orbit') as HTMLInputElement

let rpm = Number(rpmEl.value)
rpmEl.addEventListener('input', () => {
  rpm = Number(rpmEl.value)
  rpmVal.textContent = String(rpm)
})
orbitEl.addEventListener('change', () => {
  controls.autoRotate = orbitEl.checked
})

// Reduced motion opens on a still engine and a parked camera; both toggles
// are one tap away for anyone who wants the motion back.
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  spinEl.checked = false
  orbitEl.checked = false
}

const SLOWMO = 0.12
let crankAngle = THREE.MathUtils.degToRad(15)

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  composer.setSize(window.innerWidth, window.innerHeight)
})

const clock = new THREE.Clock()

function frame(): void {
  requestAnimationFrame(frame)
  const dt = Math.min(clock.getDelta(), 0.05)
  const k = 1 - Math.exp(-dt * 5)

  if (spinEl.checked) crankAngle += ((rpm / 60) * Math.PI * 2 * SLOWMO) * dt
  engine.updateCrank(crankAngle)

  for (const f of floaters) {
    const target = level >= f.offAt ? 1 : 0
    f.t += (target - f.t) * k
    const meltTarget = f.meltAt !== undefined && level >= f.meltAt ? 1 : 0
    const g0 = f.g ?? 0
    f.g = g0 + (meltTarget - g0) * k
    const base = basePositions.get(f.group)!
    f.group.position.copy(base).addScaledVector(f.dir, f.t * f.dist)
    setLayerOpacity(f.group, (f.fullFade ? 1 - f.t : 1 - f.t * 0.85) * (1 - f.g))
  }

  const blockT = level >= 3 ? 1 : 0
  const hiddenT = level >= 4 ? 1 : 0
  const blockOpacity = THREE.MathUtils.lerp(1, 0.16, blockT) * (1 - hiddenT)
  setLayerOpacity(engine.layers.block, blockOpacity, false)

  controls.update()
  composer.render()
}

frame()
