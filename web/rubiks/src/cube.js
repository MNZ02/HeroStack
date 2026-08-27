import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { FACES, plateTexture } from './plates.js'

/**
 * The cube itself: 26 cubies on a unit lattice, plus a turn engine.
 *
 * A turn re-parents the nine cubies of a layer onto a pivot, spins the pivot,
 * then bakes the pivot's matrix back into each cubie and returns it to the cube
 * group. Because every turn is a multiple of 90°, the bake ends with a snap:
 * positions rounded to the lattice and the orientation basis rounded to ±1,
 * which stops floating-point drift from accumulating over thousands of turns.
 *
 * There is no separate permutation array. Facelet state is read back off the
 * real transforms (`readFacelets`), so the HUD map and the solved check can
 * never disagree with what is on screen.
 */

/** Axis and sign for a clockwise quarter turn, seen from outside that face. */
const MOVES = {
  U: { axis: 'y', layer: 1, sign: -1 },
  D: { axis: 'y', layer: -1, sign: 1 },
  R: { axis: 'x', layer: 1, sign: -1 },
  L: { axis: 'x', layer: -1, sign: 1 },
  F: { axis: 'z', layer: 1, sign: -1 },
  B: { axis: 'z', layer: -1, sign: 1 },
}

export const FACE_LETTERS = Object.keys(MOVES)

/** Outward normal of each face, in cube space. */
const NORMALS = {
  U: [0, 1, 0], D: [0, -1, 0], R: [1, 0, 0], L: [-1, 0, 0], F: [0, 0, 1], B: [0, 0, -1],
}

const PLATE = 0.82
const LIFT = 0.503
const TAU4 = Math.PI / 2

/** Overshoot ease — the turn arrives slightly past 90° and settles back. */
function easeOutBack(t) {
  const c1 = 1.06
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

export function parseMove(token) {
  const face = token[0]
  const suffix = token.slice(1)
  return { face, amount: suffix === "'" ? -1 : suffix === '2' ? 2 : 1 }
}

export function formatMove(move) {
  return move.face + (move.amount === -1 ? "'" : move.amount === 2 ? '2' : '')
}

export function invertMove(move) {
  return { face: move.face, amount: move.amount === 2 ? 2 : -move.amount }
}

export function parseAlg(text) {
  return text.trim().split(/\s+/).filter(Boolean).map(parseMove)
}

/** Reverse order, invert each — the retrace of any sequence. */
export function invertAlg(moves) {
  return moves.slice().reverse().map(invertMove)
}

export class Cube {
  constructor() {
    this.group = new THREE.Group()
    this.cubies = []
    this.stickers = []
    this.active = null
    this.turns = 0

    const body = new THREE.MeshPhysicalMaterial({
      color: 0x13171b,
      roughness: 0.44,
      metalness: 0.0,
      clearcoat: 0.55,
      clearcoatRoughness: 0.3,
    })
    const bodyGeo = new RoundedBoxGeometry(1, 1, 1, 4, 0.085)
    const plateGeo = new THREE.PlaneGeometry(PLATE, PLATE)

    // Plate serials are handed out in build order, one counter per home face.
    const seen = { U: 0, D: 0, F: 0, B: 0, R: 0, L: 0 }

    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          if (x === 0 && y === 0 && z === 0) continue // core, never visible
          const cubie = new THREE.Group()
          cubie.position.set(x, y, z)

          const shell = new THREE.Mesh(bodyGeo, body)
          shell.castShadow = true
          shell.receiveShadow = true
          cubie.add(shell)

          for (const face of FACES) {
            const n = NORMALS[face]
            const outward = n[0] * x + n[1] * y + n[2] * z
            if (outward !== 1) continue // this cubie has no plate on that side

            const index = seen[face]++
            const tex = plateTexture(face, index)
            const plate = new THREE.Mesh(
              plateGeo,
              new THREE.MeshStandardMaterial({
                map: tex,
                transparent: true,
                alphaTest: 0.5,
                roughness: 0.32,
                metalness: 0.04,
                emissive: 0xffffff,
                emissiveMap: tex,
                emissiveIntensity: 0.07,
              })
            )
            plate.position.set(n[0] * LIFT, n[1] * LIFT, n[2] * LIFT)
            plate.lookAt(plate.position.clone().add(new THREE.Vector3(...n)))
            plate.castShadow = false
            plate.userData = { home: face, index }
            cubie.add(plate)
            this.stickers.push({ mesh: plate, cubie, home: face })
          }

          this.group.add(cubie)
          this.cubies.push(cubie)
        }
      }
    }

    this.solvedFacelets = this.readFacelets()
  }

  get busy() {
    return this.active !== null
  }

  /**
   * Begin one move. `duration` is for a quarter turn; a half turn takes longer
   * but not twice as long, which is how a real solve looks.
   */
  start(move, duration = 0.26) {
    if (this.active) return false
    const spec = MOVES[move.face]
    if (!spec) return false

    const pivot = new THREE.Group()
    this.group.add(pivot)

    const axisIndex = spec.axis
    const layer = spec.layer
    for (const cubie of this.cubies) {
      if (Math.round(cubie.position[axisIndex]) === layer) pivot.add(cubie)
    }

    const magnitude = move.amount === 2 ? 2 : 1
    this.active = {
      move,
      pivot,
      axis: spec.axis,
      angle: spec.sign * (move.amount === -1 ? -1 : 1) * TAU4 * magnitude,
      t: 0,
      dur: duration * (magnitude === 2 ? 1.45 : 1),
      members: pivot.children.slice(),
    }
    return true
  }

  update(dt) {
    const a = this.active
    if (!a) return null

    a.t = Math.min(1, a.t + dt / a.dur)
    a.pivot.rotation[a.axis] = a.angle * easeOutBack(a.t)
    if (a.t < 1) return null

    // Bake: fold the pivot's transform into each cubie, then re-home it.
    a.pivot.rotation[a.axis] = a.angle
    a.pivot.updateMatrix()
    for (const cubie of a.members) {
      cubie.applyMatrix4(a.pivot.matrix)
      this.group.add(cubie)
      snap(cubie)
    }
    this.group.remove(a.pivot)

    this.active = null
    this.turns++
    return a.move
  }

  /** Drop everything back to the solved orientation, instantly. */
  reset() {
    if (this.active) {
      this.active.pivot.rotation[this.active.axis] = 0
      for (const cubie of this.active.members) this.group.add(cubie)
      this.group.remove(this.active.pivot)
      this.active = null
    }
    // Home position is recoverable from the plates a cubie carries: each plate
    // pins one coordinate to ±1, and the coordinates with no plate stay 0.
    for (const cubie of this.cubies) {
      cubie.quaternion.identity()
      const p = new THREE.Vector3()
      for (const child of cubie.children) {
        const home = child.userData?.home
        if (!home) continue
        const n = NORMALS[home]
        p.x += n[0]; p.y += n[1]; p.z += n[2]
      }
      cubie.position.copy(p)
    }
    this.turns = 0
  }

  /**
   * Read the visible state back off the transforms.
   * Returns `{ U: [...9 home-face letters], D: [...], ... }`, row-major as the
   * face is drawn on an unfolded net.
   */
  readFacelets() {
    const out = {}
    for (const face of FACES) out[face] = Array.from({ length: 9 })
    const n = new THREE.Vector3()
    const p = new THREE.Vector3()

    for (const { mesh, cubie, home } of this.stickers) {
      n.set(0, 0, 1).applyQuaternion(mesh.quaternion).applyQuaternion(cubie.quaternion)
      p.copy(mesh.position).applyQuaternion(cubie.quaternion).add(cubie.position)

      const nx = Math.round(n.x), ny = Math.round(n.y), nz = Math.round(n.z)
      const x = Math.round(p.x), y = Math.round(p.y), z = Math.round(p.z)

      let face, row, col
      if (ny === 1) { face = 'U'; row = z + 1; col = x + 1 }
      else if (ny === -1) { face = 'D'; row = 1 - z; col = x + 1 }
      else if (nz === 1) { face = 'F'; row = 1 - y; col = x + 1 }
      else if (nz === -1) { face = 'B'; row = 1 - y; col = 1 - x }
      else if (nx === 1) { face = 'R'; row = 1 - y; col = 1 - z }
      else { face = 'L'; row = 1 - y; col = z + 1 }

      out[face][row * 3 + col] = home
    }
    return out
  }

  /** Facelets sitting on their home face, 0..54. */
  score(facelets = this.readFacelets()) {
    let correct = 0
    let faces = 0
    for (const face of FACES) {
      const hits = facelets[face].filter((home) => home === face).length
      correct += hits
      if (hits === 9) faces++
    }
    return { correct, faces, solved: correct === 54 }
  }
}

/** Round a cubie back onto the lattice and onto an axis-aligned basis. */
function snap(cubie) {
  cubie.position.set(
    Math.round(cubie.position.x),
    Math.round(cubie.position.y),
    Math.round(cubie.position.z)
  )
  const m = new THREE.Matrix4().makeRotationFromQuaternion(cubie.quaternion)
  const e = m.elements
  for (let i = 0; i < 16; i++) e[i] = Math.round(e[i])
  cubie.quaternion.setFromRotationMatrix(m)
}
