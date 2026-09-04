import { FACE_LETTERS, invertAlg, parseAlg, formatMove } from './cube.js'

/**
 * The routine director — what makes the cube play itself.
 *
 * It runs a four-beat loop: scramble, retrace, pattern, restore. The solve is a
 * *retrace* — the scramble replayed backwards — not a search. That is a real
 * limitation and the HUD says so: a Kociemba solver would find a ~20-move
 * answer where the retrace takes the same number of moves it took to scramble.
 * The point here is the machine and the plates, so the honest cheap solve wins.
 *
 * Patterns are the classic algorithms, applied from solved and then undone the
 * same way.
 */

const OPPOSITE = { U: 'D', D: 'U', L: 'R', R: 'L', F: 'B', B: 'F' }

export const PATTERNS = [
  { name: 'CHECKERBOARD', alg: 'U2 D2 F2 B2 L2 R2', note: 'six faces, every centre inverted' },
  { name: 'CUBE IN A CUBE', alg: "F L F U' R U F2 L2 U' L' B D' B' L2 U", note: 'one corner nests a second cube' },
  { name: 'SIX SPOTS', alg: "U D' R L' F B' U D'", note: 'each face keeps only its centre' },
  { name: 'TETRIS', alg: "L R F B U' D' L' R'", note: 'stacked slabs, four colours per face' },
  { name: 'ANACONDA', alg: "L U B' U' R L' B R' F B' D R D' F'", note: 'a band that coils the whole cube' },
  { name: 'SUPERFLIP', alg: "U R2 F B R B2 R U2 L B2 R U' D' R2 F R' L B2 U2 F2", note: "every edge flipped — 20 moves, God's number" },
]

export const SCRAMBLE_DEPTH = 20

/** A scramble with no wasted turns: no repeated face, no A B A on one axis. */
export function scramble(depth = SCRAMBLE_DEPTH) {
  const moves = []
  let last = null
  let beforeLast = null
  while (moves.length < depth) {
    const face = FACE_LETTERS[(Math.random() * FACE_LETTERS.length) | 0]
    if (face === last) continue
    if (face === beforeLast && OPPOSITE[face] === last) continue
    const amount = [1, -1, 2][(Math.random() * 3) | 0]
    moves.push({ face, amount })
    beforeLast = last
    last = face
  }
  return moves
}

export class Director {
  constructor() {
    this.queue = []
    this.manualQueue = []
    this.history = []
    this.beat = 'scramble'
    this.rest = 0.9
    this.cycles = 0
    this.patternIndex = 0
    this.enabled = true
    this.tracking = false
    this.phase = { label: 'STANDBY', note: 'autoplay armed', total: 0, done: 0 }
  }

  get idle() {
    return this.queue.length === 0 && this.manualQueue.length === 0
  }

  /** Moves still to play, manual first, as notation, for the HUD queue strip. */
  preview(n = 24) {
    return [...this.manualQueue, ...this.queue].slice(0, n).map(formatMove)
  }

  /**
   * Manual play: the user takes the cube. Holds the autoplay loop, drops
   * any queued routine so the move plays next, and queues ahead of
   * everything. Successive calls append, so fast clicking never loses a
   * move. While a tracked routine is being recorded the move is appended
   * to history too, so a later retrace still lands solved.
   */
  manual(moves) {
    const list = (Array.isArray(moves) ? moves : [moves]).filter(
      (m) => m && FACE_LETTERS.includes(m.face) && (m.amount === 1 || m.amount === -1 || m.amount === 2)
    )
    if (!list.length) return []
    this.enabled = false
    this.queue = []
    this.manualQueue.push(...list)
    this.phase = { label: 'MANUAL', note: 'you have the cube — autoplay held', total: 0, done: 0 }
    return list
  }

  load(label, note, moves, { track = false } = {}) {
    this.queue = moves
    if (track) this.history = []
    this.tracking = track
    this.phase = { label, note, total: moves.length, done: 0 }
  }

  scrambleNow() {
    this.load('SCRAMBLE', `${SCRAMBLE_DEPTH} random quarter turns`, scramble(), { track: true })
    this.beat = 'retrace'
  }

  retraceNow() {
    if (!this.history.length) return this.scrambleNow()
    this.load('RETRACE SOLVE', 'the scramble, replayed backwards', invertAlg(this.history))
    this.history = [] // consumed: the cube lands solved, nothing left to undo
    this.beat = 'pattern'
  }

  patternNow() {
    const p = PATTERNS[this.patternIndex % PATTERNS.length]
    this.load(`PATTERN · ${p.name}`, p.note, parseAlg(p.alg), { track: true })
    this.beat = 'restore'
  }

  restoreNow() {
    if (!this.history.length) return this.scrambleNow()
    this.load('RESTORE', 'unwinding the pattern', invertAlg(this.history))
    this.history = []
    this.patternIndex++
    this.cycles++
    this.beat = 'scramble'
  }

  /** Pick up the next beat of the loop once the current one has drained. */
  advance() {
    if (this.beat === 'scramble') this.scrambleNow()
    else if (this.beat === 'retrace') this.retraceNow()
    else if (this.beat === 'pattern') this.patternNow()
    else this.restoreNow()
  }

  /**
   * Feed the cube. Returns the move that was started this tick, or null.
   * `rest` holds a beat between routines so the finished state is readable.
   */
  tick(dt, cube, duration) {
    if (cube.busy) return null

    if (this.manualQueue.length) {
      const move = this.manualQueue.shift()
      if (!cube.start(move, duration)) return null
      if (this.tracking) this.history.push(move)
      return move
    }

    if (this.queue.length === 0) {
      if (!this.enabled) {
        if (this.phase.label !== 'PAUSED' && this.phase.label !== 'MANUAL') {
          this.phase = { label: 'PAUSED', note: 'autoplay held', total: 0, done: 0 }
        }
        return null
      }
      this.rest -= dt
      if (this.rest > 0) return null
      this.rest = 0.9
      this.advance()
    }

    // A queue loaded by a button plays out even while paused — pausing stops
    // the loop from starting the *next* routine, not the current one.
    const move = this.queue.shift()
    if (!move) return null
    cube.start(move, duration)
    if (this.tracking) this.history.push(move)
    this.phase.done++
    return move
  }
}
