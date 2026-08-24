import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { createRaptor } from './raptor'

const LEVELS = [
  { desc: 'Complete Raptor in one piece — bell, copper chamber, cooling jacket, twin preburner/turbopump modules and the feed network.' },
  { desc: 'The turbopump/preburner assembly lifts away. Everything stays visible — it is simply pulled apart.' },
  { desc: 'The bell drops clear below, leaving the copper chamber and its cooling jacket exposed.' },
  { desc: 'The cooling jacket lifts and the chamber ghosts translucent, revealing the injector and the burn inside it.' },
  { desc: 'Fully exploded: every part pulled apart, the bare hot section burning at the core.' },
]

const canvas = document.getElementById('scene') as HTMLCanvasElement

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.25

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0d0f12)
scene.fog = new THREE.Fog(0x0d0f12, 16, 44)

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100)
camera.position.set(8.0, 0.6, 9.8)

const controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(0, 0.0, 0)
controls.enableDamping = true
controls.dampingFactor = 0.08
controls.minDistance = 3.5
controls.maxDistance = 20
controls.maxPolarAngle = Math.PI * 0.58
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
  0.18,
  0.6,
  0.9,
)
composer.addPass(bloom)
composer.addPass(new OutputPass())

// A soft ambient floor plus a strong hemisphere so no part falls to black, even
// the exploded shells that drift away from the key light.
scene.add(new THREE.AmbientLight(0x40454d, 0.5))
scene.add(new THREE.HemisphereLight(0xd6e3ff, 0x2c2a26, 1.0))

const key = new THREE.DirectionalLight(0xfff4e8, 2.6)
key.position.set(6, 9, 5)
key.castShadow = true
key.shadow.mapSize.set(2048, 2048)
key.shadow.camera.left = -6
key.shadow.camera.right = 6
key.shadow.camera.top = 6
key.shadow.camera.bottom = -6
key.shadow.camera.near = 0.5
key.shadow.camera.far = 26
key.shadow.bias = -0.0004
scene.add(key)

const rim = new THREE.DirectionalLight(0x88aaff, 1.3)
rim.position.set(-7, 4, -6)
scene.add(rim)

// Soft front fill so the near faces and the underside of the exploded parts
// are lit rather than falling into silhouette.
const fill = new THREE.DirectionalLight(0xbfd4ff, 0.7)
fill.position.set(3, -1, 9)
scene.add(fill)

function floorTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(256, 256, 20, 256, 256, 250)
  grad.addColorStop(0, '#2c2f32')
  grad.addColorStop(0.45, '#17191c')
  grad.addColorStop(1, '#0c0e10')
  g.fillStyle = grad
  g.fillRect(0, 0, 512, 512)
  return new THREE.CanvasTexture(c)
}

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(11, 64).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({ map: floorTexture(), roughness: 0.9, metalness: 0.05 }),
)
ground.position.y = -2.35
ground.receiveShadow = true
scene.add(ground)

const grid = new THREE.GridHelper(18, 36, 0x30353d, 0x1c2026)
grid.position.y = -2.345
;(grid.material as THREE.Material).transparent = true
;(grid.material as THREE.Material).opacity = 0.35
scene.add(grid)

const raptor = createRaptor()
scene.add(raptor.root)

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

const throttleEl = document.getElementById('throttle') as HTMLInputElement
const throttleVal = document.getElementById('throttleVal') as HTMLElement
const flowEl = document.getElementById('flow') as HTMLInputElement
const orbitEl = document.getElementById('orbit') as HTMLInputElement

let throttle = Number(throttleEl.value) / 100
throttleEl.addEventListener('input', () => {
  throttle = Number(throttleEl.value) / 100
  throttleVal.textContent = String(Number(throttleEl.value))
})
orbitEl.addEventListener('change', () => {
  controls.autoRotate = orbitEl.checked
})

// Reduced motion opens on a cold, parked engine; both toggles are one tap away.
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  flowEl.checked = false
  orbitEl.checked = false
}

type Layer = 'externals' | 'nozzle' | 'jacket' | 'chamber' | 'internals'
const LAYERS: Layer[] = ['externals', 'nozzle', 'jacket', 'chamber', 'internals']

interface LayerTarget {
  pos: [number, number, number]
  op: number
}

/**
 * The cutaway is an exploded view: each layer translates away along the engine
 * axis *while staying visible*, so the whole engine is pulled apart and every
 * component can be read. The chamber itself ghosts translucent on the last two
 * levels so the internals — injector, shock diamonds, the burn — show through it.
 */
const LEVEL_TARGETS: Record<Layer, LayerTarget>[] = [
  {
    externals: { pos: [0, 0, 0], op: 1 },
    nozzle: { pos: [0, 0, 0], op: 1 },
    jacket: { pos: [0, 0, 0], op: 1 },
    chamber: { pos: [0, 0, 0], op: 1 },
    internals: { pos: [0, 0, 0], op: 0 },
  },
  {
    externals: { pos: [0, 1.0, 0], op: 1 },
    nozzle: { pos: [0, 0, 0], op: 1 },
    jacket: { pos: [0, 0, 0], op: 1 },
    chamber: { pos: [0, 0, 0], op: 1 },
    internals: { pos: [0, 0, 0], op: 0 },
  },
  {
    externals: { pos: [0, 1.7, 0], op: 1 },
    nozzle: { pos: [0, -1.3, 0], op: 1 },
    jacket: { pos: [0, 0, 0], op: 1 },
    chamber: { pos: [0, 0, 0], op: 1 },
    internals: { pos: [0, 0, 0], op: 0 },
  },
  {
    externals: { pos: [0, 1.5, 0], op: 1 },
    nozzle: { pos: [0, -1.4, 0], op: 1 },
    jacket: { pos: [0, 0.7, 0], op: 1 },
    chamber: { pos: [0, 0, 0], op: 0.62 },
    internals: { pos: [0, 0, 0], op: 1 },
  },
  {
    externals: { pos: [0, 1.7, 0], op: 0.95 },
    nozzle: { pos: [0, -1.5, 0], op: 0.95 },
    jacket: { pos: [0, 0.8, 0], op: 0.92 },
    chamber: { pos: [0, 0, 0], op: 0.34 },
    internals: { pos: [0, 0, 0], op: 1 },
  },
]

const state: Record<Layer, { pos: THREE.Vector3; op: number }> = {
  externals: { pos: new THREE.Vector3(), op: 1 },
  nozzle: { pos: new THREE.Vector3(), op: 1 },
  jacket: { pos: new THREE.Vector3(), op: 1 },
  chamber: { pos: new THREE.Vector3(), op: 1 },
  internals: { pos: new THREE.Vector3(), op: 0 },
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  composer.setSize(window.innerWidth, window.innerHeight)
})

const clock = new THREE.Clock()
let elapsed = 0

function frame(): void {
  requestAnimationFrame(frame)
  const dt = Math.min(clock.getDelta(), 0.05)
  const k = 1 - Math.exp(-dt * 5)

  const activeThrottle = flowEl.checked ? throttle : 0
  if (flowEl.checked) elapsed += dt
  raptor.update(elapsed, activeThrottle)

  const target = LEVEL_TARGETS[level]
  for (const L of LAYERS) {
    const s = state[L]
    const tar = target[L]
    s.pos.x += (tar.pos[0] - s.pos.x) * k
    s.pos.y += (tar.pos[1] - s.pos.y) * k
    s.pos.z += (tar.pos[2] - s.pos.z) * k
    s.op += (tar.op - s.op) * k

    raptor.setLayerOffset(L, s.pos.x, s.pos.y, s.pos.z)
    raptor.setLayerOpacity(L, s.op, L === 'chamber' && level >= 3)
  }

  controls.update()
  composer.render()
}

frame()
