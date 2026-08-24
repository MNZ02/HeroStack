import * as THREE from 'three'

export type Layer = 'externals' | 'nozzle' | 'jacket' | 'chamber' | 'internals'

export interface Raptor {
  root: THREE.Group
  setLayerOpacity: (layer: Layer, opacity: number, ghost?: boolean) => void
  setLayerOffset: (layer: Layer, x: number, y: number, z: number) => void
  update: (elapsed: number, throttle: number) => void
}

/**
 * SpaceX Raptor — a full-flow staged-combustion methalox engine, built entirely
 * from geometry (no model file). The hot section (bell, throat, chamber) is a
 * surface of revolution; the two preburner/turbopump modules hang off the sides
 * behind a web of feed lines.
 *
 * Stripping it is an *exploded* cutaway: each layer both fades *and* translates
 * away along the engine axis, so the separated shells stay visible in the
 * periphery while the inner core is revealed. The turbopumps spin, the injector
 * sprays and the chamber glows at whatever throttle you set.
 *
 * Every mesh registers its material against one of five per-layer lists, so a
 * layer is faded by fading its materials — the same trick lets a single joint
 * group hold cooling-jacket, chamber and internals and still strip cleanly.
 * Gas-like materials carry their own `baseOpacity` so a translucent flame can
 * live inside an otherwise opaque layer.
 */

const layersMats: Record<Layer, THREE.MeshPhysicalMaterial[]> = {
  externals: [],
  nozzle: [],
  jacket: [],
  chamber: [],
  internals: [],
}

function m<L extends Layer>(layer: L, params: THREE.MeshPhysicalMaterialParameters): THREE.MeshPhysicalMaterial {
  const mm = new THREE.MeshPhysicalMaterial(params)
  mm.transparent = true
  layersMats[layer].push(mm)
  return mm
}

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material): THREE.Mesh {
  const o = new THREE.Mesh(geo, mat)
  o.castShadow = true
  o.receiveShadow = true
  return o
}

/** Surface of revolution around the Y axis from [radius, height] points. */
function lathe(points: Array<[number, number]>, segs: number): THREE.BufferGeometry {
  return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segs)
}

function ribTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 64
  const g = c.getContext('2d')!
  for (let x = 0; x < 64; x++) {
    const shade = x % 8 < 4 ? 210 : 90
    g.fillStyle = `rgb(${shade},${shade},${shade})`
    g.fillRect(x, 0, 1, 64)
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(48, 3)
  return t
}

function plateTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  g.fillStyle = '#808080'
  g.fillRect(0, 0, 128, 128)
  g.fillStyle = '#e8e8e8'
  for (let ring = 0; ring < 4; ring++) {
    const r = 12 + ring * 14
    const n = 6 + ring * 6
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      g.beginPath()
      g.arc(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 3.5, 0, Math.PI * 2)
      g.fill()
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

export function createRaptor(): Raptor {
  const root = new THREE.Group()

  const plumeBase = new THREE.Group()
  root.add(plumeBase)

  // ---- hot-section materials ------------------------------------------
  const chamberMat = m('chamber', {
    color: 0xb8731f,
    metalness: 0.95,
    roughness: 0.34,
    bumpMap: ribTexture(),
    bumpScale: 0.5,
    envMapIntensity: 0.7,
  })
  const nozzleMat = m('nozzle', { color: 0x4a4f55, metalness: 0.85, roughness: 0.42, envMapIntensity: 0.6 })
  const jacketMat = m('jacket', { color: 0x878e96, metalness: 0.95, roughness: 0.3, envMapIntensity: 0.7 })
  const linerMat = m('internals', {
    color: 0x2a2e36,
    metalness: 0.7,
    roughness: 0.5,
    bumpMap: ribTexture(),
    bumpScale: 0.45,
    side: THREE.BackSide,
  })

  const injectorMat = m('internals', {
    color: 0xaeb6bf,
    metalness: 0.95,
    roughness: 0.28,
    bumpMap: plateTexture(),
    bumpScale: 0.35,
    emissive: 0xff5a12,
    emissiveIntensity: 0,
  })
  const flameMat = m('internals', {
    color: 0x1a0d06,
    transparent: true,
    emissive: 0xff3a08,
    emissiveIntensity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  flameMat.userData.baseOpacity = 0.5
  const flameCoreMat = m('internals', {
    color: 0x1a1206,
    transparent: true,
    emissive: 0xffe08a,
    emissiveIntensity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  flameCoreMat.userData.baseOpacity = 0.9
  const crownMat = m('internals', {
    color: 0x0a2438,
    transparent: true,
    emissive: 0x5ec6ff,
    emissiveIntensity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  crownMat.userData.baseOpacity = 0.75
  const diamondMat = m('internals', {
    color: 0x241106,
    transparent: true,
    emissive: 0xffd08a,
    emissiveIntensity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  diamondMat.userData.baseOpacity = 0.85
  const throatMat = m('internals', {
    color: 0x2a1206,
    transparent: true,
    emissive: 0xff7a2a,
    emissiveIntensity: 0,
    depthWrite: false,
  })
  const igniterMat = m('internals', { color: 0xdadfe4, metalness: 1, roughness: 0.2 })

  const extMat = m('externals', { color: 0xc7cfd6, metalness: 0.9, roughness: 0.28, envMapIntensity: 0.7 })
  const pipeMat = m('externals', { color: 0xb8bec6, metalness: 0.95, roughness: 0.3 })
  const darkMat = m('externals', { color: 0x14161a, metalness: 0.6, roughness: 0.5 })
  const cuffMat = m('externals', { color: 0x2a6f9e, metalness: 0.7, roughness: 0.4 })
  const goldMat = m('externals', { color: 0xd6b46a, metalness: 1, roughness: 0.24 })

  // ---- nozzle (bell) ---------------------------------------------------
  const nozzlePts: Array<[number, number]> = [
    [0.82, -1.82],
    [0.68, -1.66],
    [0.53, -1.36],
    [0.4, -1.02],
    [0.315, -0.68],
    [0.27, -0.4],
    [0.256, -0.14],
  ]
  const nozzle = new THREE.Group()
  plumeBase.add(nozzle)
  nozzle.add(mesh(lathe(nozzlePts, 56), nozzleMat))
  const lip = mesh(new THREE.TorusGeometry(0.82, 0.03, 10, 64).rotateX(Math.PI / 2), nozzleMat)
  lip.position.y = -1.82
  nozzle.add(lip)

  // ---- chamber (throat up to the dome) --------------------------------
  const chamberPts: Array<[number, number]> = [
    [0.256, -0.14],
    [0.266, 0.12],
    [0.3, 0.45],
    [0.37, 0.78],
    [0.45, 1.04],
    [0.5, 1.18],
    [0.5, 1.3],
  ]
  const chamber = new THREE.Group()
  plumeBase.add(chamber)
  chamber.add(mesh(lathe(chamberPts, 56), chamberMat))
  const cap = mesh(new THREE.SphereGeometry(0.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), chamberMat)
  cap.position.y = 1.3
  chamber.add(cap)

  // ---- cooling jacket ------------------------------------------------
  const jacket = new THREE.Group()
  plumeBase.add(jacket)
  const jacketPts: Array<[number, number]> = chamberPts
    .slice(2)
    .map(([r, y]) => [r * 1.14, y] as [number, number])
  jacket.add(mesh(lathe(jacketPts, 56), jacketMat))
  const jacketBand = mesh(new THREE.CylinderGeometry(0.57, 0.57, 0.12, 48), jacketMat)
  jacketBand.position.y = 0.5
  jacket.add(jacketBand)

  // ---- internals: liner, injector, flame ------------------------------
  const internals = new THREE.Group()
  plumeBase.add(internals)

  const liner = mesh(lathe(chamberPts, 48), linerMat)
  internals.add(liner)

  // Injector plate with a concentric element field and a central pintle.
  const plate = mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.06, 48), injectorMat)
  plate.position.y = 1.02
  internals.add(plate)
  for (const ring of [0, 1, 2]) {
    const count = 12 + ring * 6
    const r = 0.12 + ring * 0.11
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2
      const cup = mesh(new THREE.CylinderGeometry(0.026, 0.02, 0.1, 8), injectorMat)
      cup.position.set(Math.cos(a) * r, 0.96, Math.sin(a) * r)
      internals.add(cup)
    }
  }
  const pintle = mesh(new THREE.ConeGeometry(0.11, 0.3, 20).rotateX(Math.PI), injectorMat)
  pintle.position.set(0, 0.9, 0)
  internals.add(pintle)
  const pintleTip = mesh(new THREE.SphereGeometry(0.045, 12, 10), injectorMat)
  pintleTip.position.set(0, 0.79, 0)
  internals.add(pintleTip)

  // Combustion flame: wide at the injector, drawn down through the throat.
  const flame = mesh(
    lathe(
      [
        [0.34, 1.0],
        [0.31, 0.74],
        [0.27, 0.4],
        [0.24, 0.04],
        [0.22, -0.32],
        [0.2, -0.68],
      ],
      32,
    ),
    flameMat,
  )
  internals.add(flame)
  const core = mesh(
    lathe(
      [
        [0.2, 0.98],
        [0.17, 0.7],
        [0.14, 0.4],
        [0.11, 0.06],
        [0.1, -0.32],
      ],
      28,
    ),
    flameCoreMat,
  )
  internals.add(core)
  // Cool oxidizer crown right under the injector.
  const crown = mesh(lathe([[0.3, 1.0], [0.28, 0.9]], 36), crownMat)
  internals.add(crown)

  // Shock diamonds — bright flattened nodes down the hot column.
  const diamonds: THREE.Mesh[] = []
  const diamondGeo = new THREE.SphereGeometry(0.16, 14, 10)
  for (const y of [0.86, 0.56, 0.24, -0.02, -0.26]) {
    const d = mesh(diamondGeo, diamondMat)
    d.scale.set(0.9, 0.28, 0.9)
    d.position.y = y
    diamonds.push(d)
    internals.add(d)
  }

  // Throat insert — the narrowest, hottest ring.
  const throatRing = mesh(new THREE.TorusGeometry(0.24, 0.018, 10, 40).rotateX(Math.PI / 2), throatMat)
  throatRing.position.y = -0.13
  internals.add(throatRing)

  // Chamber glow light so the inner faces heat up under throttle.
  const glowLight = new THREE.PointLight(0xff5a2a, 0, 6, 2)
  glowLight.position.set(0, 0.3, 0)
  plumeBase.add(glowLight)

  // Two igniter probes entering the chamber from above.
  for (const sx of [-1, 1]) {
    const ign = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8), igniterMat)
    ign.position.set(sx * 0.18, 1.42, 0)
    ign.rotation.x = 0.5
    internals.add(ign)
  }

  // ---- externals: twin preburner/turbopump modules + plumbing ---------
  const externals = new THREE.Group()
  root.add(externals)
  const pumps: THREE.Object3D[] = []

  function elbow(group: THREE.Group, pts: Array<[number, number, number]>, r: number, mat: THREE.Material): void {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)))
    group.add(mesh(new THREE.TubeGeometry(curve, 24, r, 10), mat))
  }

  function buildModule(side: number): void {
    const mod = new THREE.Group()
    mod.position.set(side * 0.46, 0.52, 0)
    externals.add(mod)

    // Preburner chamber (tall, domed top).
    const preburner = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.56, 28), extMat)
    preburner.position.set(-side * 0.08, 0.42, 0)
    mod.add(preburner)
    const pcap = mesh(new THREE.SphereGeometry(0.15, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), extMat)
    pcap.position.set(-side * 0.08, 0.7, 0)
    mod.add(pcap)
    const cuff = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 28), cuffMat)
    cuff.position.set(-side * 0.08, 0.18, 0)
    mod.add(cuff)

    // Turbopump with a visible impeller (spins about its axis).
    const pump = new THREE.Group()
    pump.position.set(side * 0.04, -0.02, 0)
    mod.add(pump)
    const body = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.42, 24).rotateZ(Math.PI / 2), extMat)
    pump.add(body)
    const volute = mesh(new THREE.TorusGeometry(0.13, 0.05, 10, 24).rotateY(Math.PI / 2), darkMat)
    pump.add(volute)
    // Turbine wheel: a fluted octagonal disk with radial blades.
    const wheel = mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.045, 8).rotateZ(Math.PI / 2), darkMat)
    pump.add(wheel)
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      const blade = mesh(new THREE.BoxGeometry(0.02, 0.13, 0.02), extMat)
      blade.position.set(0, Math.sin(a) * 0.07, Math.cos(a) * 0.07)
      blade.rotation.x = -a
      pump.add(blade)
    }
    const pumpCone = mesh(new THREE.CylinderGeometry(0.05, 0.1, 0.14, 12).rotateZ(Math.PI / 2), goldMat)
    pumpCone.position.x = side * 0.24
    pump.add(pumpCone)
    pumps.push(pump)

    // Feed plumbing.
    elbow(
      mod,
      [
        [-side * 0.08, 0.16, 0],
        [-side * 0.06, -0.02, 0.12],
        [side * 0.02, -0.04, 0.16],
      ],
      0.05,
      pipeMat,
    )
    elbow(mod, [[side * 0.04, -0.1, -0.04], [side * 0.08, -0.22, 0], [side * 0.1, -0.38, 0]], 0.05, pipeMat)
    elbow(
      mod,
      [
        [side * 0.02, -0.08, 0],
        [-side * 0.08, -0.1, 0.02],
        [-side * 0.18, -0.16, 0],
      ],
      0.06,
      pipeMat,
    )
  }
  buildModule(-1)
  buildModule(1)

  for (const sx of [-1, 1]) {
    elbow(
      externals,
      [
        [sx * 0.2, 1.16, 0.02],
        [sx * 0.5, 1.0, 0.2],
        [sx * 0.52, 0.62, 0.16],
        [sx * 0.3, 0.28, 0.0],
      ],
      0.055,
      pipeMat,
    )
  }

  // Gimbal mount with actuator struts.
  const gimbal = new THREE.Group()
  gimbal.position.y = 1.5
  externals.add(gimbal)
  const ring = mesh(new THREE.TorusGeometry(0.32, 0.05, 12, 40), extMat)
  gimbal.add(ring)
  for (const sx of [-1, 1]) {
    const strut = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 10), cuffMat)
    strut.position.set(sx * 0.3, 0.28, 0)
    strut.rotation.z = sx * 0.4
    gimbal.add(strut)
    const piston = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 12), darkMat)
    piston.position.set(sx * 0.22, 0.18, 0)
    piston.rotation.z = sx * 0.4
    gimbal.add(piston)
  }

  // ---- layer control ---------------------------------------------------
  const layerGroups: Record<Layer, THREE.Group> = { externals, nozzle, jacket, chamber, internals }
  const basePos = new Map<Layer, THREE.Vector3>()
  for (const key of Object.keys(layerGroups) as Layer[]) {
    basePos.set(key, layerGroups[key].position.clone())
  }

  function setLayerOpacity(layer: Layer, opacity: number, ghost = false): void {
    const on = opacity > 0.02
    for (const mat of layersMats[layer]) {
      mat.visible = on
      if (on) {
        const base = (mat.userData.baseOpacity as number | undefined) ?? 1
        mat.opacity = opacity * base
        mat.depthWrite = ghost ? false : mat.opacity > 0.98
        mat.needsUpdate = true
      }
    }
  }

  function setLayerOffset(layer: Layer, x: number, y: number, z: number): void {
    const b = basePos.get(layer)!
    layerGroups[layer].position.set(b.x + x, b.y + y, b.z + z)
  }

  // ---- animation -------------------------------------------------------
  function update(elapsed: number, throttle: number): void {
    const spin = elapsed * (2 + throttle * 20)
    for (const p of pumps) p.rotation.x = -spin

    gimbal.rotation.z = 0.03 * Math.sin(elapsed)

    const flicker = throttle > 0.02 ? 1 + 0.12 * Math.sin(elapsed * 24 * throttle) : 0
    flameMat.emissiveIntensity = 2.0 * throttle * flicker
    flameCoreMat.emissiveIntensity = 3.8 * throttle * flicker
    crownMat.emissiveIntensity = 1.7 * throttle * (1 + 0.2 * Math.sin(elapsed * 30 * throttle))
    injectorMat.emissiveIntensity = 1.3 * throttle
    diamondMat.emissiveIntensity = 3.0 * throttle * flicker
    throatMat.emissiveIntensity = 2.6 * throttle * flicker
    glowLight.intensity = throttle * 6
    flame.scale.y = 1 + 0.08 * Math.sin(elapsed * 20 * throttle) * throttle
    core.scale.y = flame.scale.y
    flame.rotation.y = elapsed * 0.5 * throttle
    core.rotation.y = flame.rotation.y
    for (let i = 0; i < diamonds.length; i++) {
      const pulse = 0.85 + 0.15 * Math.sin(elapsed * 30 * throttle - i * 0.9)
      diamonds[i].scale.y = 0.28 * pulse
    }
  }

  update(0, 0)

  return { root, setLayerOpacity, setLayerOffset, update }
}
