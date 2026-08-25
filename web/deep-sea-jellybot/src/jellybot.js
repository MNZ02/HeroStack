import * as THREE from 'three'

const UP = new THREE.Vector3(0, 1, 0)
const Z_AXIS = new THREE.Vector3(0, 0, 1)
const INK = 0x3a382d
const INK_DARK = 0x2b2920
const STEEL = 0x8f8974
const RED = '#c2312b'
const RED_C = new THREE.Color(RED)
const INK_C = new THREE.Color(0x6e6956)

const inkMat = new THREE.MeshStandardMaterial({ color: INK, roughness: 0.5, metalness: 0.6 })
const darkMat = new THREE.MeshStandardMaterial({ color: INK_DARK, roughness: 0.4, metalness: 0.55 })
const steelMat = new THREE.MeshStandardMaterial({ color: STEEL, roughness: 0.55, metalness: 0.45 })
const redMat = new THREE.MeshStandardMaterial({ color: RED, roughness: 0.45, metalness: 0.15 })
const beaconMat = new THREE.MeshStandardMaterial({ color: RED, emissive: RED, emissiveIntensity: 1.5, roughness: 0.3 })
const gridMat = new THREE.LineBasicMaterial({ color: 0x4c4839, transparent: true, opacity: 0.9 })

const DOME_R = 1.6
const DOME_H = 1.38
const PI2 = Math.PI * 2

function makeDomeGrid() {
  const pts = []
  const meridians = 24
  const parallels = 9
  for (let m = 0; m < meridians; m++) {
    const phi = (m / meridians) * PI2
    const c = Math.cos(phi)
    const s = Math.sin(phi)
    const seg = 28
    for (let i = 0; i < seg; i++) {
      const t0 = (i / seg) * (Math.PI / 2)
      const t1 = ((i + 1) / seg) * (Math.PI / 2)
      pts.push(c * DOME_R * Math.sin(t0), DOME_H * Math.cos(t0), s * DOME_R * Math.sin(t0))
      pts.push(c * DOME_R * Math.sin(t1), DOME_H * Math.cos(t1), s * DOME_R * Math.sin(t1))
    }
  }
  for (let p = 1; p <= parallels; p++) {
    const th = (p / (parallels + 1)) * (Math.PI / 2)
    const r = DOME_R * Math.sin(th)
    const y = DOME_H * Math.cos(th)
    const seg = 96
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * PI2
      const a1 = ((i + 1) / seg) * PI2
      pts.push(Math.cos(a0) * r, y, Math.sin(a0) * r)
      pts.push(Math.cos(a1) * r, y, Math.sin(a1) * r)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
  return g
}

function makePlate(radius) {
  const g = new THREE.Group()
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.96, 0.06, 48), steelMat)
  disc.castShadow = true
  g.add(disc)
  const notchGeo = new THREE.BoxGeometry(0.18, 0.05, 0.1)
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * PI2
    const notch = new THREE.Mesh(notchGeo, inkMat)
    notch.position.set(Math.cos(a) * (radius + 0.04), 0, Math.sin(a) * (radius + 0.04))
    notch.rotation.y = Math.PI / 2 - a
    g.add(notch)
  }
  return g
}

function machBox(w, h, d, mat = inkMat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
  m.castShadow = true
  return m
}

function machCyl(r, h, mat = darkMat) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 16), mat)
  m.castShadow = true
  return m
}

export class JellyBot {
  constructor(scene) {
    this.group = new THREE.Group()
    scene.add(this.group)

    this.time = 0
    this.phase = 0
    this.yaw = 0
    this.explodeTarget = 0
    this.explodeK = 0
    this.deform = { sq: 0, exhaust: 0 }
    this.loads = Array.from({ length: 12 }, () => 0.15)

    // ---------------- NEURAL DOME ----------------
    this.dome = new THREE.Group()
    this.group.add(this.dome)

    this.shellGroup = new THREE.Group()
    this.shellGroup.add(new THREE.LineSegments(makeDomeGrid(), gridMat))

    const film = new THREE.Mesh(
      new THREE.SphereGeometry(DOME_R, 48, 24, 0, PI2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({
        color: 0xdad5c0, transparent: true, opacity: 0.1,
        side: THREE.DoubleSide, depthWrite: false, roughness: 0.9,
      }),
    )
    film.scale.y = DOME_H / DOME_R
    this.shellGroup.add(film)

    const rim = new THREE.Mesh(new THREE.TorusGeometry(DOME_R, 0.05, 12, 120), inkMat)
    rim.rotation.x = Math.PI / 2
    rim.castShadow = true
    this.shellGroup.add(rim)
    const rimRed = new THREE.Mesh(new THREE.TorusGeometry(DOME_R + 0.015, 0.012, 8, 120), redMat)
    rimRed.rotation.x = Math.PI / 2
    rimRed.position.y = -0.06
    this.shellGroup.add(rimRed)
    this.dome.add(this.shellGroup)

    this.plateBottom = makePlate(1.14)
    this.plateBottom.position.y = 0.18
    const pbTop = 0.03
    const pbParts = [
      { x: 0.55, z: 0.1, m: machBox(0.16, 0.2, 0.12) },
      { x: -0.45, z: 0.12, m: machBox(0.14, 0.18, 0.12) },
      { x: 0.1, z: -0.55, m: machCyl(0.07, 0.22) },
      { x: -0.15, z: 0.5, m: machCyl(0.06, 0.18) },
      { x: 0.62, z: -0.35, m: machBox(0.12, 0.1, 0.12, redMat) },
      { x: -0.6, z: -0.4, m: machCyl(0.05, 0.14, inkMat) },
    ]
    for (const pt of pbParts) {
      pt.m.position.set(pt.x, pbTop + pt.m.geometry.parameters.height / 2, pt.z)
      this.plateBottom.add(pt.m)
    }
    const coilB = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.028, 8, 32), steelMat)
    coilB.position.set(-0.28, pbTop + 0.03, -0.62)
    coilB.rotation.x = Math.PI / 2
    this.plateBottom.add(coilB)
    const hub = machCyl(0.17, 0.1, inkMat)
    hub.position.y = pbTop + 0.05
    this.plateBottom.add(hub)
    const column = machCyl(0.085, 0.46, inkMat)
    column.position.y = pbTop + 0.31
    this.plateBottom.add(column)
    const colBand = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.014, 8, 24), redMat)
    colBand.rotation.x = Math.PI / 2
    colBand.position.y = pbTop + 0.46
    this.plateBottom.add(colBand)
    this.dome.add(this.plateBottom)

    this.plateTop = makePlate(0.88)
    this.plateTop.position.y = 0.62
    const ptTop = 0.03
    const ptParts = [
      { x: 0.3, z: 0.25, m: machBox(0.14, 0.16, 0.12) },
      { x: -0.32, z: 0.1, m: machBox(0.12, 0.14, 0.1) },
      { x: 0.05, z: -0.35, m: machCyl(0.06, 0.2) },
      { x: -0.15, z: -0.4, m: machCyl(0.05, 0.12, redMat) },
      { x: 0.35, z: -0.15, m: machBox(0.1, 0.1, 0.1, darkMat) },
    ]
    for (const pt of ptParts) {
      pt.m.position.set(pt.x, ptTop + pt.m.geometry.parameters.height / 2, pt.z)
      this.plateTop.add(pt.m)
    }
    const mast = machCyl(0.028, 0.42, inkMat)
    mast.position.y = ptTop + 0.21
    this.plateTop.add(mast)
    this.dome.add(this.plateTop)

    this.guts = new THREE.Group()
    const gutsParts = [
      { x: 0.42, z: 0.18, y: 0.15, m: machBox(0.13, 0.15, 0.11) },
      { x: -0.3, z: 0.3, y: 0.2, m: machCyl(0.055, 0.2) },
      { x: -0.15, z: -0.4, y: 0.12, m: machBox(0.1, 0.12, 0.1, darkMat) },
      { x: 0.12, z: 0.45, y: 0.08, m: machBox(0.09, 0.08, 0.09, redMat) },
      { x: -0.45, z: -0.12, y: 0.1, m: machBox(0.12, 0.1, 0.1) },
    ]
    for (const gt of gutsParts) {
      gt.m.position.set(gt.x, 0.66 + gt.y, gt.z)
      gt.m.rotation.y = gt.x * 2
      this.guts.add(gt.m)
    }
    const coilG = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.024, 8, 32), steelMat)
    coilG.position.set(0.3, 0.74, -0.32)
    coilG.rotation.z = Math.PI / 2
    this.guts.add(coilG)
    this.dome.add(this.guts)

    this.pod = new THREE.Group()
    this.pod.position.y = 1.02
    const stalk = machCyl(0.036, 0.18, inkMat)
    stalk.position.y = 0.09
    this.pod.add(stalk)
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.19, 24, 16), darkMat)
    cap.scale.set(1, 0.6, 1)
    cap.position.y = 0.22
    cap.castShadow = true
    this.pod.add(cap)
    this.beacon = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), beaconMat)
    this.beacon.position.y = 0.35
    this.pod.add(this.beacon)
    this.dome.add(this.pod)

    // ---------------- UTILITY SPINE ----------------
    this.spine = new THREE.Group()
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.06, 10, 60), inkMat)
    collar.rotation.x = Math.PI / 2
    collar.position.y = -0.04
    collar.castShadow = true
    this.spine.add(collar)

    const neck = machCyl(0.36, 0.38, inkMat)
    neck.position.y = -0.26
    this.spine.add(neck)

    for (const a of [0, 2.4, 4.2]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 0.02), redMat)
      panel.position.set(Math.sin(a) * 0.37, -0.26, Math.cos(a) * 0.37)
      panel.rotation.y = a
      this.spine.add(panel)
    }

    const band = new THREE.Mesh(new THREE.TorusGeometry(0.385, 0.032, 10, 48), steelMat)
    band.rotation.x = Math.PI / 2
    band.position.y = -0.5
    this.spine.add(band)

    const mid = machCyl(0.33, 0.3, inkMat)
    mid.position.y = -0.68
    this.spine.add(mid)

    for (const a of [0.5, 1.6, 2.7, 3.8, 5.2]) {
      const nub = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 8), darkMat)
      nub.quaternion.setFromUnitVectors(UP, new THREE.Vector3(Math.sin(a), 0, Math.cos(a)))
      nub.position.set(Math.sin(a) * 0.37, -0.78, Math.cos(a) * 0.37)
      this.spine.add(nub)
      const nubTip = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), redMat)
      nubTip.position.y = 0.08
      nub.add(nubTip)
    }

    const taper = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.33, 0.55, 20), inkMat)
    taper.position.y = -1.1
    taper.castShadow = true
    this.spine.add(taper)

    const taperRing = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.02, 8, 32), steelMat)
    taperRing.rotation.x = Math.PI / 2
    taperRing.position.y = -1.38
    this.spine.add(taperRing)

    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.15, 0.34, 16), darkMat)
    tail.position.y = -1.6
    tail.castShadow = true
    this.spine.add(tail)

    const tailTip = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.11, 12), redMat)
    tailTip.rotation.x = Math.PI
    tailTip.position.y = -1.81
    this.spine.add(tailTip)
    this.group.add(this.spine)

    // ---------------- CALLOUT ANCHORS ----------------
    this.podAnchor = new THREE.Object3D()
    this.podAnchor.position.set(0, 0.24, 0)
    this.pod.add(this.podAnchor)

    this.shellAnchor = new THREE.Object3D()
    this.shellAnchor.position.set(0.55, 0.62, 0.45).normalize().multiplyScalar(1.36)
    this.shellGroup.add(this.shellAnchor)

    this.spineAnchor = new THREE.Object3D()
    this.spineAnchor.position.set(0.24, -0.6, 0.2)
    this.spine.add(this.spineAnchor)

    this.anchorTentacle = new THREE.Vector3()

    this.callouts = [
      { obj: this.podAnchor, label: '01 // OPTIC MAST — NEURAL DOME' },
      { obj: this.shellAnchor, label: '02 // MEMBRANE GRID — NEURAL DOME' },
      { obj: this.spineAnchor, label: '03 // UTILITY SPINE — POWER + BALLAST' },
      { local: this.anchorTentacle, label: '04 // PROPULSOR LIMB — ACTUATOR ×12' },
    ]

    this._q = new THREE.Quaternion()
    this._qz = new THREE.Quaternion()
    this._qy = new THREE.Quaternion()
    this._m = new THREE.Matrix4()
    this._sc = new THREE.Vector3()
    this._p = new THREE.Vector3()
    this._tan = new THREE.Vector3()

    this.buildTentacles()
  }

  buildTentacles() {
    const OUTER = 12
    const ARMS = 4
    const SEG_O = 22
    const SEG_A = 15

    this.tentacles = []
    let total = 0
    for (let i = 0; i < OUTER; i++) {
      this.tentacles.push(this.makeSpec((i / OUTER) * PI2 + 0.13, 3.9 + Math.random() * 0.7, SEG_O, false))
      total += SEG_O
    }
    for (let i = 0; i < ARMS; i++) {
      this.tentacles.push(this.makeSpec((i / ARMS) * PI2 + 0.55, 3.1 + Math.random() * 0.3, SEG_A, true))
      total += SEG_A
    }
    this.totalSegs = total

    const strutGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 7, 1)
    this.strutMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.45 })
    this.struts = new THREE.InstancedMesh(strutGeo, this.strutMat, total)
    this.struts.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.struts.frustumCulled = false
    this.struts.castShadow = true
    let idx = 0
    for (const tn of this.tentacles) {
      for (let s = 0; s < tn.segs; s++) {
        const red = tn.arm ? s >= tn.segs - 2 : s === tn.segs - 1
        this.struts.setColorAt(idx++, red ? RED_C : INK_C)
      }
    }
    this.struts.instanceColor.needsUpdate = true
    this.group.add(this.struts)

    const nodeCount = total + this.tentacles.length
    const nodeGeo = new THREE.BufferGeometry()
    nodeGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(nodeCount * 3), 3).setUsage(THREE.DynamicDrawUsage),
    )
    this.nodeMat = new THREE.PointsMaterial({
      color: 0x4a473a,
      size: 0.055,
      transparent: true,
      opacity: 0.9,
      depthWrite: true,
    })
    this.nodes = new THREE.Points(nodeGeo, this.nodeMat)
    this.nodes.frustumCulled = false
    this.group.add(this.nodes)
  }

  makeSpec(angle, len, segs, arm) {
    return {
      angle,
      len,
      segs,
      arm,
      radius: arm ? 1.12 : 1.48,
      startY: -0.02,
      r0: arm ? 0.075 : 0.05,
      r1: arm ? 0.02 : 0.011,
      phase: Math.random() * PI2,
      freq: 1.5 + Math.random() * 0.7,
      prevSway: 0,
    }
  }

  setExploded(on) {
    this.explodeTarget = on ? 1 : 0
  }

  update(dt, pulseRate) {
    this.time += dt
    this.phase += dt * pulseRate * PI2

    const k = (this.explodeK += (this.explodeTarget - this.explodeK) * Math.min(1, dt * 2.5))
    const ke = k * k * (3 - 2 * k)

    const c = Math.sin(this.phase)
    const exhaust = Math.max(0, -Math.cos(this.phase))
    this.deform.sq = 0.06 * c
    this.deform.exhaust = exhaust

    const sq = this.deform.sq

    // neural dome stack separation
    this.shellGroup.scale.set(1 + sq, 1 - sq * 0.85, 1 + sq)
    this.shellGroup.position.y = 1.35 * ke
    this.pod.position.y = 1.02 + 2.0 * ke
    this.guts.position.y = 0.75 * ke
    this.plateTop.position.y = 0.62 + 0.42 * ke
    this.plateBottom.position.y = 0.18
    this.spine.position.y = -1.05 * ke

    const strobe = this.time % 1.4
    beaconMat.emissiveIntensity = strobe < 0.1 || (strobe > 0.2 && strobe < 0.3) ? 2.4 : 0.25

    this.group.position.y = 0.55 + 0.1 * Math.sin(this.phase + Math.PI * 0.5)
    this.yaw = (this.yaw + dt * 0.04) % PI2
    const tilt = 0.3 + 0.035 * Math.sin(this.time * 0.25)
    this._qz.setFromAxisAngle(Z_AXIS, tilt)
    this._qy.setFromAxisAngle(UP, this.yaw)
    this.group.quaternion.copy(this._qz).multiply(this._qy)

    const q = this._q
    const m = this._m
    const sc = this._sc
    const p = this._p
    const tan = this._tan

    const nodeArr = this.nodes.geometry.attributes.position.array
    let idx = 0
    let nidx = 0

    for (let ti = 0; ti < this.tentacles.length; ti++) {
      const tn = this.tentacles[ti]
      const n = tn.segs
      const radius = tn.radius * (1 + 0.32 * ke)
      const startY = tn.startY - 0.35 * ke
      const bx = Math.cos(tn.angle) * radius
      const bz = Math.sin(tn.angle) * radius
      const px = -Math.sin(tn.angle)
      const pz = Math.cos(tn.angle)
      const ca = Math.cos(tn.angle)
      const sa = Math.sin(tn.angle)
      const amp = 0.28 + 0.5 * exhaust
      const startIdx = nidx

      for (let s = 0; s <= n; s++) {
        const u = s / n
        const sway =
          (Math.sin(u * 5.0 - this.time * tn.freq + tn.phase) * 0.6 +
            Math.sin(u * 8.5 - this.time * tn.freq * 1.7 + tn.phase * 1.6) * 0.28) *
          Math.pow(u, 1.3) *
          amp
        const out = u * (0.34 + 0.3 * exhaust * Math.sin(u * 3.0 - this.time * 1.1 + tn.phase))
        const x = bx + px * sway + ca * out
        const z = bz + pz * sway + sa * out
        const y =
          startY -
          u * tn.len * (1 - 0.1 * c * u) +
          0.02 * Math.sin(this.time * 2 + u * 9 + tn.phase) * u

        nodeArr[nidx++] = x
        nodeArr[nidx++] = y
        nodeArr[nidx++] = z
      }

      if (ti === 3) {
        const a = startIdx + 11 * 3
        this.anchorTentacle.set(nodeArr[a], nodeArr[a + 1], nodeArr[a + 2])
      }

      if (ti < 12) {
        const swayTip = amp * (Math.sin(5.0 - this.time * tn.freq + tn.phase) * 0.6 + Math.sin(8.5 - this.time * tn.freq * 1.7 + tn.phase * 1.6) * 0.28)
        const kin = Math.abs(swayTip - tn.prevSway) / Math.max(dt, 1e-3)
        tn.prevSway = swayTip
        const load = Math.min(1, 0.12 + kin * 0.55)
        this.loads[ti] += (load - this.loads[ti]) * Math.min(1, dt * 6)
      }

      for (let s = 0; s < n; s++) {
        const i3 = startIdx + s * 3
        const ax = nodeArr[i3]
        const ay = nodeArr[i3 + 1]
        const az = nodeArr[i3 + 2]
        tan.set(nodeArr[i3 + 3] - ax, nodeArr[i3 + 4] - ay, nodeArr[i3 + 5] - az)
        const L = tan.length() || 1e-4
        tan.divideScalar(L)
        q.setFromUnitVectors(UP, tan)
        const u = (s + 0.5) / n
        const bead = 0.74 + 0.42 * Math.pow(Math.abs(Math.sin((s + 0.5) * 1.7 + tn.phase)), 0.9)
        const rr = THREE.MathUtils.lerp(tn.r0, tn.r1, u) * (1 + 0.15 * exhaust) * bead
        sc.set(rr * 2, L, rr * 2)
        p.set((ax + nodeArr[i3 + 3]) / 2, (ay + nodeArr[i3 + 4]) / 2, (az + nodeArr[i3 + 5]) / 2)
        m.compose(p, q, sc)
        this.struts.setMatrixAt(idx++, m)
      }
    }

    this.struts.instanceMatrix.needsUpdate = true
    this.nodes.geometry.attributes.position.needsUpdate = true
  }
}
