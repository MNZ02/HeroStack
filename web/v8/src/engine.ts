import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

export const BANK_ANGLE = Math.PI / 4

const SPACING = 1.05
const CRANK_R = 0.34
const ROD_L = 1.15
const THROW_ANGLES = [0, 90, 270, 180].map((d) => THREE.MathUtils.degToRad(d))

interface Cylinder {
  axis: THREE.Vector2
  z: number
  throwAngle: number
  piston: THREE.Group
  rod: THREE.Group
}

export interface EngineLayers {
  intake: THREE.Group
  ignition: THREE.Group
  covers: THREE.Group[]
  heads: THREE.Group[]
  pan: THREE.Group
  block: THREE.Group
}

export interface Engine {
  root: THREE.Group
  crankGroup: THREE.Group
  camGroup: THREE.Group
  layers: EngineLayers
  updateCrank: (angle: number) => void
}

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat)
  m.castShadow = true
  m.receiveShadow = true
  return m
}

function castTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  g.fillStyle = '#808080'
  g.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 900; i++) {
    const light = Math.random() > 0.5
    g.fillStyle = `rgba(${light ? 255 : 0},${light ? 255 : 0},${light ? 255 : 0},${(
      0.04 + Math.random() * 0.16
    ).toFixed(3)})`
    g.beginPath()
    g.arc(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 9, 0, Math.PI * 2)
    g.fill()
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

export function createEngine(): Engine {
  const root = new THREE.Group()

  const cast = castTexture()

  function physical(
    color: number,
    metalness: number,
    roughness: number,
    extra: Partial<THREE.MeshPhysicalMaterialParameters> = {},
  ): THREE.MeshPhysicalMaterial {
    const m = new THREE.MeshPhysicalMaterial({ color, metalness, roughness, ...extra })
    m.transparent = true
    return m
  }

  const ironMat = physical(0x767d85, 0.6, 0.6, { bumpMap: cast, bumpScale: 0.5 })
  const headMat = physical(0xb4bac2, 0.92, 0.38, { bumpMap: cast, bumpScale: 0.25 })
  const coverMat = physical(0x8f1d1d, 0.25, 0.48, {
    clearcoat: 0.65,
    clearcoatRoughness: 0.28,
    bumpMap: cast,
    bumpScale: 0.35,
  })
  const intakeMat = physical(0x878d94, 0.9, 0.45, { bumpMap: cast, bumpScale: 0.3 })
  const panMat = physical(0x33383d, 0.9, 0.4, { bumpMap: cast, bumpScale: 0.2 })
  const aluMat = physical(0xdadfe4, 0.95, 0.3, { envMapIntensity: 0.55 })
  const steelMat = physical(0xe4e8ec, 1.0, 0.22, { envMapIntensity: 0.65 })
  const darkMat = physical(0x141518, 0.05, 0.85)
  const linerMat = physical(0x121417, 0.7, 0.35, { side: THREE.BackSide })
  const headerMat = physical(0x8b9097, 0.95, 0.32)
  const ignMetal = physical(0x24272b, 0.85, 0.45)
  const capMat = physical(0x101114, 0, 0.3, { clearcoat: 0.8, clearcoatRoughness: 0.2 })
  const wireMat = physical(0xb32c2c, 0, 0.38, { clearcoat: 0.55, clearcoatRoughness: 0.25 })
  const plugMat = physical(0xe4e8ec, 1, 0.17)
  const coverBoltMat = physical(0xdde1e6, 1, 0.2)
  const coverCapMat = physical(0x141518, 0.05, 0.85)
  const railSteel = physical(0xe4e8ec, 1, 0.15)
  const tbMat = physical(0xdadfe4, 0.95, 0.18)
  const hornDark = physical(0x141518, 0.05, 0.85)
  const accDark = physical(0x17191c, 0.35, 0.5)
  const accAlu = physical(0xb4bac2, 0.92, 0.38)
  const dipMat = physical(0xe4e8ec, 1, 0.17)

  const sinB = Math.sin(BANK_ANGLE)
  const cosB = Math.cos(BANK_ANGLE)

  const block = new THREE.Group()
  const crankcase = mesh(new RoundedBoxGeometry(1.95, 1.2, 4.75, 3, 0.07), ironMat)
  crankcase.position.y = -0.22
  block.add(crankcase)
  for (const s of [-1, 1]) {
    const slab = mesh(new RoundedBoxGeometry(1.18, 1.95, 4.75, 3, 0.07), ironMat)
    slab.position.set(s * sinB * 0.92, cosB * 0.92, 0)
    slab.rotation.z = -s * BANK_ANGLE
    block.add(slab)

    const liners = new THREE.Group()
    liners.rotation.z = -s * BANK_ANGLE
    for (let i = 0; i < 4; i++) {
      const tube = mesh(new THREE.CylinderGeometry(0.365, 0.365, 1.72, 28, 1, true), linerMat)
      tube.position.set(0, 1.03, (i - 1.5) * SPACING)
      liners.add(tube)
    }
    block.add(liners)
  }
  const valley = mesh(new RoundedBoxGeometry(1.25, 0.14, 4.76, 2, 0.04), ironMat)
  valley.position.y = 1.06
  block.add(valley)

  const filterBody = mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.52, 22).rotateZ(Math.PI / 2), accDark)
  filterBody.position.set(1.12, -0.45, 1.35)
  block.add(filterBody)
  const filterPlate = mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.05, 22).rotateZ(Math.PI / 2), ironMat)
  filterPlate.position.set(0.98, -0.45, 1.35)
  block.add(filterPlate)

  const dipCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.72, -0.72, 1.05),
    new THREE.Vector3(-0.84, -0.28, 1.15),
    new THREE.Vector3(-0.6, 0.18, 1.25),
  ])
  block.add(mesh(new THREE.TubeGeometry(dipCurve, 20, 0.02, 8), dipMat))

  root.add(block)

  const heads: THREE.Group[] = []
  const covers: THREE.Group[] = []

  function addHeaders(layer: THREE.Group, s: number): void {
    const tube = (pts: [number, number, number][], r: number) =>
      mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))),
          36,
          r,
          12,
        ),
        headerMat,
      )
    for (let i = 0; i < 4; i++) {
      const z = (i - 1.5) * SPACING
      layer.add(tube([[s * 0.58, 1.99, z], [s * 0.92, 1.92, z], [s * 1.14, 1.62, z], [s * 1.25, 1.16, z * 0.4]], 0.082))
      layer.add(mesh(new RoundedBoxGeometry(0.09, 0.24, 0.3, 2, 0.03), headerMat).translateX(s * 0.6).translateY(1.99).translateZ(z))
    }
    layer.add(mesh(new THREE.CylinderGeometry(0.165, 0.165, 3.5, 20).rotateX(Math.PI / 2), headerMat).translateX(s * 1.27).translateY(0.98).translateZ(0.15))
    layer.add(mesh(new THREE.CylinderGeometry(0.205, 0.165, 0.18, 20).rotateX(Math.PI / 2), headerMat).translateX(s * 1.27).translateY(0.98).translateZ(1.99))
    layer.add(tube([[s * 1.27, 0.98, 1.95], [s * 1.35, 0.6, 2.12], [s * 1.37, 0.15, 2.18]], 0.148))
  }

  for (const s of [-1, 1]) {
    const bank = new THREE.Group()
    bank.rotation.z = -s * BANK_ANGLE

    const headLayer = new THREE.Group()
    const headBlock = mesh(new RoundedBoxGeometry(1.24, 0.34, 4.72, 2, 0.06), headMat)
    headBlock.position.y = 2.065
    headLayer.add(headBlock)
    for (let i = 0; i < 4; i++) {
      const plug = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.3, 10), plugMat)
      plug.rotation.z = Math.PI / 2 - s * 0.5
      plug.position.set(s * 0.45, 2.02, (i - 1.5) * SPACING)
      headLayer.add(plug)
    }
    addHeaders(headLayer, s)
    bank.add(headLayer)
    heads.push(headLayer)

    const coverLayer = new THREE.Group()
    const cover = mesh(new RoundedBoxGeometry(1.04, 0.3, 4.42, 3, 0.09), coverMat)
    cover.position.y = 2.385
    coverLayer.add(cover)
    for (const x of [-0.3, 0, 0.3]) {
      const rib = mesh(new RoundedBoxGeometry(0.08, 0.05, 4.3, 2, 0.02), coverMat)
      rib.position.set(x, 2.56, 0)
      coverLayer.add(rib)
    }
    const boltGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.045, 6)
    for (let i = 0; i < 10; i++) {
      for (const side of [-1, 1]) {
        const bolt = mesh(boltGeo, coverBoltMat)
        bolt.position.set(side * 0.44, 2.53, -1.9 + i * 0.42)
        coverLayer.add(bolt)
      }
    }
    const cap = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.09, 14), coverCapMat)
    cap.position.set(0.26, 2.57, 1.4)
    coverLayer.add(cap)
    bank.add(coverLayer)
    covers.push(coverLayer)

    root.add(bank)
  }

  const intake = new THREE.Group()
  const plenum = mesh(new RoundedBoxGeometry(1.35, 0.34, 3.3, 3, 0.09), intakeMat)
  plenum.position.y = 1.78
  intake.add(plenum)
  const lid = mesh(new RoundedBoxGeometry(1.1, 0.12, 3.0, 2, 0.04), intakeMat)
  lid.position.y = 1.99
  intake.add(lid)
  const runnerGeo = new THREE.CylinderGeometry(0.115, 0.115, 0.62, 16)
  const lipGeo = new THREE.TorusGeometry(0.118, 0.028, 10, 20)
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const runner = mesh(runnerGeo, intakeMat)
      runner.position.set(s * 0.78, 1.63, (i - 1.5) * SPACING)
      runner.rotation.z = s * -0.72
      intake.add(runner)
      const lip = mesh(lipGeo, intakeMat)
      lip.position.set(s * 0.98, 1.75, (i - 1.5) * SPACING)
      lip.rotation.z = s * -0.72 + Math.PI / 2
      intake.add(lip)
    }
    const rail = mesh(new THREE.CylinderGeometry(0.035, 0.035, 3.2, 12).rotateX(Math.PI / 2), railSteel)
    rail.position.set(s * 0.95, 1.78, 0)
    intake.add(rail)
    for (let i = 0; i < 4; i++) {
      const injector = mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.2, 10), hornDark)
      injector.position.set(s * 0.82, 1.71, (i - 1.5) * SPACING)
      injector.rotation.z = s * -0.55
      intake.add(injector)
    }
  }
  const tb = mesh(new THREE.CylinderGeometry(0.2, 0.20, 0.36, 20).rotateX(Math.PI / 2), tbMat)
  tb.position.set(0, 1.9, 1.85)
  intake.add(tb)
  const horn = mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.3, 20).rotateX(Math.PI / 2), hornDark)
  horn.position.set(0, 1.9, 2.15)
  intake.add(horn)
  root.add(intake)

  const ignition = new THREE.Group()
  const distPos = new THREE.Vector3(0, 0.84, -2.02)
  const distBody = mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.4, 18), ignMetal)
  distBody.position.copy(distPos).y += 0.1
  ignition.add(distBody)
  const distCap = mesh(new THREE.CylinderGeometry(0.185, 0.165, 0.17, 18), capMat)
  distCap.position.copy(distPos).y += 0.38
  ignition.add(distCap)
  const towerGeo = new THREE.CylinderGeometry(0.026, 0.026, 0.085, 8)
  const towerTops: THREE.Vector3[] = []
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + 0.39
    const tower = mesh(towerGeo, capMat)
    tower.position.set(distPos.x + Math.cos(a) * 0.135, distPos.y + 0.51, distPos.z + Math.sin(a) * 0.135)
    towerTops.push(tower.position.clone())
    tower.position.y += 0.0
    ignition.add(tower)
    towerTops[k] = tower.position.clone().add(new THREE.Vector3(0, 0.04, 0))
  }

  function plugWorld(s: number, i: number): THREE.Vector3 {
    return new THREE.Vector3(s * 0.45, 2.06, (i - 1.5) * SPACING).applyEuler(
      new THREE.Euler(0, 0, -s * BANK_ANGLE),
    )
  }
  for (let k = 0; k < 8; k++) {
    const s = k % 2 === 0 ? 1 : -1
    const i = Math.floor(k / 2)
    const target = plugWorld(s, i).add(new THREE.Vector3(s * sinB, cosB, 0).multiplyScalar(0.14))
    const from = towerTops[k]
    const mid1 = from.clone().lerp(target, 0.3).add(new THREE.Vector3(0, 0.34, 0))
    const mid2 = from.clone().lerp(target, 0.68).add(new THREE.Vector3(0, 0.16, 0))
    const curve = new THREE.CatmullRomCurve3([from, mid1, mid2, target])
    ignition.add(mesh(new THREE.TubeGeometry(curve, 24, 0.021, 8), wireMat))
  }
  root.add(ignition)

  const pan = new THREE.Group()
  const tray = mesh(new RoundedBoxGeometry(1.85, 0.5, 4.6, 2, 0.08), panMat)
  tray.position.y = -1.05
  pan.add(tray)
  const sump = mesh(new RoundedBoxGeometry(1.85, 0.55, 1.5, 2, 0.1), panMat)
  sump.position.set(0, -1.32, 1.3)
  pan.add(sump)
  root.add(pan)

  const crankGroup = new THREE.Group()
  const journalGeo = new THREE.CylinderGeometry(0.16, 0.16, SPACING * 0.96, 20).rotateX(Math.PI / 2)
  for (let i = 0; i <= 4; i++) {
    const j = mesh(journalGeo, steelMat)
    j.position.z = (i - 2) * SPACING
    crankGroup.add(j)
  }
  const snout = mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.85, 14).rotateX(Math.PI / 2), steelMat)
  snout.position.z = 2.47
  crankGroup.add(snout)
  const damper = mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.13, 32).rotateX(Math.PI / 2), darkMat)
  damper.position.z = 2.66
  crankGroup.add(damper)
  for (const dz of [-0.03, 0.03]) {
    const groove = mesh(new THREE.TorusGeometry(0.425, 0.012, 8, 40), steelMat)
    groove.position.z = 2.66 + dz
    crankGroup.add(groove)
  }
  const hub = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.24, 16).rotateX(Math.PI / 2), steelMat)
  hub.position.z = 2.79
  crankGroup.add(hub)
  const flywheel = mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.1, 48).rotateX(Math.PI / 2), steelMat)
  flywheel.position.z = -2.42
  crankGroup.add(flywheel)
  const ringGear = mesh(new THREE.TorusGeometry(0.69, 0.05, 10, 72), darkMat)
  ringGear.position.z = -2.42
  crankGroup.add(ringGear)
  const toothCount = 64
  const teeth = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.045, 0.07), darkMat, toothCount)
  teeth.castShadow = true
  const _m = new THREE.Matrix4()
  const _q = new THREE.Quaternion()
  const _e = new THREE.Euler()
  for (let i = 0; i < toothCount; i++) {
    const a = (i / toothCount) * Math.PI * 2
    _e.set(0, 0, a)
    _q.setFromEuler(_e)
    _m.compose(new THREE.Vector3(Math.cos(a) * 0.74, Math.sin(a) * 0.74, -2.42), _q, new THREE.Vector3(1, 1, 1))
    teeth.setMatrixAt(i, _m)
  }
  crankGroup.add(teeth)
  const fwBoltGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.06, 6).rotateX(Math.PI / 2)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.26
    const b = mesh(fwBoltGeo, steelMat)
    b.position.set(Math.cos(a) * 0.19, Math.sin(a) * 0.19, -2.49)
    crankGroup.add(b)
  }
  const pinGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.66, 16).rotateX(Math.PI / 2)
  const webGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.09, 24).rotateX(Math.PI / 2)
  const cwGeo = new THREE.BoxGeometry(0.6, 0.24, 0.09)
  for (let i = 0; i < 4; i++) {
    const phi = THROW_ANGLES[i]
    const z = (i - 1.5) * SPACING
    const pin = mesh(pinGeo, steelMat)
    pin.position.set(Math.cos(phi) * CRANK_R, Math.sin(phi) * CRANK_R, z)
    crankGroup.add(pin)
    for (const side of [-1, 1]) {
      const web = mesh(webGeo, steelMat)
      web.position.z = z + side * 0.36
      crankGroup.add(web)
      const cw = mesh(cwGeo, steelMat)
      cw.position.set(Math.cos(phi + Math.PI) * 0.33, Math.sin(phi + Math.PI) * 0.33, z + side * 0.36)
      cw.rotation.z = phi + Math.PI / 2
      crankGroup.add(cw)
    }
  }
  root.add(crankGroup)

  const camGroup = new THREE.Group()
  camGroup.position.set(0, 0.58, 0)
  camGroup.add(mesh(new THREE.CylinderGeometry(0.055, 0.055, 4.35, 12).rotateX(Math.PI / 2), steelMat))
  for (const z of [-1.9, -0.7, 0.5, 1.7]) {
    const j = mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.06, 14).rotateX(Math.PI / 2), steelMat)
    j.position.z = z
    camGroup.add(j)
  }
  const lobeGeo = new THREE.CylinderGeometry(0.105, 0.105, 0.075, 18).rotateX(Math.PI / 2)
  for (let k = 0; k < 8; k++) {
    const holder = new THREE.Group()
    holder.rotation.z = THROW_ANGLES[k % 4] + (k % 2 === 0 ? 0 : Math.PI / 2) + k * 0.31
    const lobe = mesh(lobeGeo, steelMat)
    lobe.scale.x = 1.5
    lobe.position.x = 0.05
    lobe.position.z = -1.58 + Math.floor(k / 2) * SPACING + (k % 2 === 0 ? -0.09 : 0.09)
    holder.add(lobe)
    camGroup.add(holder)
  }
  const camGear = mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.07, 28).rotateX(Math.PI / 2), darkMat)
  camGear.position.z = 2.2
  camGroup.add(camGear)
  root.add(camGroup)

  const frontCover = mesh(new RoundedBoxGeometry(1.7, 1.9, 0.08, 2, 0.03), accDark)
  frontCover.position.set(0, 0.35, 2.41)
  block.add(frontCover)
  const pumpBody = mesh(new RoundedBoxGeometry(0.85, 0.85, 0.45, 2, 0.08), accAlu)
  pumpBody.position.set(0, 0.95, 2.58)
  block.add(pumpBody)
  const pumpPulley = mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.12, 28).rotateX(Math.PI / 2), accDark)
  pumpPulley.position.set(0, 0.95, 2.88)
  block.add(pumpPulley)

  const cylinders: Cylinder[] = []
  const pistonPts: [number, number][] = [
    [0.24, -0.155],
    [0.3, -0.13],
    [0.328, -0.07],
    [0.332, -0.01],
    [0.318, 0.02],
    [0.332, 0.05],
    [0.318, 0.08],
    [0.332, 0.115],
    [0.33, 0.19],
    [0.33, 0.24],
    [0.28, 0.245],
    [0.16, 0.245],
    [0.09, 0.225],
    [0, 0.225],
  ]
  const pistonGeo = new THREE.LatheGeometry(
    pistonPts.map(([r, y]) => new THREE.Vector2(r, y)),
    36,
  )
  const ringGeo = new THREE.TorusGeometry(0.333, 0.013, 8, 36).rotateX(Math.PI / 2)
  const wristGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.46, 12).rotateX(Math.PI / 2)
  const rodShaftGeo = new THREE.CylinderGeometry(0.052, 0.078, 0.86, 14)
  const flangeGeo = new THREE.BoxGeometry(0.105, 0.72, 0.028)
  const bigEndGeo = new THREE.TorusGeometry(0.165, 0.06, 12, 24)
  const smallEndGeo = new THREE.TorusGeometry(0.1, 0.048, 10, 20)
  const rodBoltGeo = new THREE.CylinderGeometry(0.026, 0.026, 0.09, 6)
  for (let i = 0; i < 4; i++) {
    for (const s of [-1, 1]) {
      const axis = new THREE.Vector2(s * sinB, cosB)
      const piston = new THREE.Group()
      piston.rotation.z = -s * BANK_ANGLE
      piston.add(mesh(pistonGeo, aluMat))
      for (const y of [0.035, 0.065, 0.1]) {
        const ring = mesh(ringGeo, darkMat)
        ring.position.y = y
        piston.add(ring)
      }
      piston.add(mesh(wristGeo, steelMat))
      root.add(piston)

      const rod = new THREE.Group()
      const shaft = mesh(rodShaftGeo, steelMat)
      shaft.position.y = 0.51
      rod.add(shaft)
      for (const fz of [-0.032, 0.032]) {
        const flange = mesh(flangeGeo, steelMat)
        flange.position.set(0, 0.5, fz)
        rod.add(flange)
      }
      rod.add(mesh(bigEndGeo, steelMat))
      const smallEnd = mesh(smallEndGeo, steelMat)
      smallEnd.position.y = 1
      rod.add(smallEnd)
      for (const bx of [-0.125, 0.125]) {
        const bolt = mesh(rodBoltGeo, steelMat)
        bolt.position.set(bx, -0.055, 0)
        rod.add(bolt)
      }
      root.add(rod)

      cylinders.push({
        axis,
        z: (i - 1.5) * SPACING + s * 0.075,
        throwAngle: THROW_ANGLES[i],
        piston,
        rod,
      })
    }
  }

  const UP = new THREE.Vector3(0, 1, 0)
  const dir = new THREE.Vector3()

  function updateCrank(angle: number): void {
    crankGroup.rotation.z = angle
    camGroup.rotation.z = angle / 2
    for (const c of cylinders) {
      const phi = c.throwAngle + angle
      const px = Math.cos(phi) * CRANK_R
      const py = Math.sin(phi) * CRANK_R
      const along = px * c.axis.x + py * c.axis.y
      const d = along + Math.sqrt(Math.max(ROD_L * ROD_L - (CRANK_R * CRANK_R - along * along), 1e-6))
      c.piston.position.set(c.axis.x * d, c.axis.y * d, c.z)
      dir.set(c.piston.position.x - px, c.piston.position.y - py, 0)
      const len = dir.length() || 1e-6
      dir.divideScalar(len)
      c.rod.position.set(px, py, c.z)
      c.rod.quaternion.setFromUnitVectors(UP, dir)
      c.rod.scale.set(1, len, 1)
    }
  }

  updateCrank(THREE.MathUtils.degToRad(15))

  return {
    root,
    crankGroup,
    camGroup,
    layers: { intake, ignition, covers, heads, pan, block },
    updateCrank,
  }
}
