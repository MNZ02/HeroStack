/**
 * Headless check of the turn engine.
 *
 * three.js runs fine in node; the only DOM the cube needs is a canvas for the
 * plate artwork, and the artwork is irrelevant to the maths — so the 2D context
 * is stubbed out with no-ops and the whole engine is exercised for real.
 *
 *   node scripts/cube-test.mjs
 */
const noopCtx = new Proxy({}, {
  get: (_t, k) => {
    if (k === 'createLinearGradient') return () => ({ addColorStop() {} })
    if (k === 'canvas') return { width: 256, height: 256 }
    return () => {}
  },
  set: () => true,
})
globalThis.document = {
  createElement: () => ({ width: 256, height: 256, getContext: () => noopCtx }),
}

const { Cube, parseAlg, parseAlgStrict, invertAlg, formatMove } = await import('../src/cube.js')
const { PATTERNS, scramble, Director } = await import('../src/autoplay.js')

const cube = new Cube()

/** Apply a move instantly by stepping its animation straight to completion. */
function apply(move) {
  cube.start(move, 0.01)
  cube.update(1)
}
const run = (moves) => moves.forEach(apply)
const move = (token) => parseAlg(token)[0]
const alg = (name) => parseAlg(PATTERNS.find((p) => p.name === name).alg)

let failures = 0
const check = (label, ok, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`)
  if (!ok) failures++
}

// 1. Solved on build, and the read-back agrees.
check('solved on build', cube.score().solved)

// 2. U is clockwise seen from above: F's top row goes to L.
apply(move('U'))
const f = cube.readFacelets()
check("U: F top row now shows R's colour", f.F.slice(0, 3).join('') === 'RRR', f.F.join(''))
check("U: L top row now shows F's colour", f.L.slice(0, 3).join('') === 'FFF', f.L.join(''))
check('U: the U face itself is untouched', f.U.every((c) => c === 'U'))
apply(move("U'"))
check("U U' returns to solved", cube.score().solved)

// 3. Group identities on every face.
for (const face of ['U', 'D', 'L', 'R', 'F', 'B']) {
  run(parseAlg(`${face} ${face} ${face} ${face}`))
  check(`${face}×4 is identity`, cube.score().solved)
  run(parseAlg(`${face} ${face}'`))
  check(`${face} ${face}' is identity`, cube.score().solved)
  run(parseAlg(`${face}2 ${face}2`))
  check(`${face}2 ${face}2 is identity`, cube.score().solved)
}

// 4. The sexy move has order 6.
for (let i = 0; i < 6; i++) run(parseAlg("R U R' U'"))
check("(R U R' U')×6 is identity", cube.score().solved)

// 5. Every canned pattern disturbs the cube, and its inverse restores it.
for (const p of PATTERNS) {
  const moves = parseAlg(p.alg)
  run(moves)
  const s = cube.score()
  check(`${p.name} disturbs the cube`, !s.solved, `${s.correct}/54 home`)
  run(invertAlg(moves))
  check(`${p.name} inverse restores`, cube.score().solved)
}

// 6. Superflip flips every edge and moves nothing else: 6 centres + 24 corner
//    facelets stay home, all 24 edge facelets leave.
run(alg('SUPERFLIP'))
check('superflip leaves exactly 30 facelets home', cube.score().correct === 30, `${cube.score().correct}/54`)
run(invertAlg(alg('SUPERFLIP')))

// 7. Forty scramble/retrace cycles — what autoplay actually does, at depth.
for (let i = 0; i < 40; i++) {
  const s = scramble()
  run(s)
  if (cube.score().solved) check(`scramble ${i} actually scrambled`, false)
  run(invertAlg(s))
  if (!cube.score().solved) check(`retrace ${i} landed solved`, false)
}
check('40 scramble/retrace cycles land solved', cube.score().solved, `${cube.turns} turns applied`)

// 8. And after all that, the lattice is still exact — this is what `snap` buys.
const drift = cube.cubies.reduce((worst, c) => {
  const d = [c.position.x, c.position.y, c.position.z]
    .reduce((a, v) => Math.max(a, Math.abs(v - Math.round(v))), 0)
  return Math.max(worst, d)
}, 0)
check('no lattice drift', drift === 0, `max ${drift}`)

// 9. reset() from a scrambled state.
run(scramble())
cube.reset()
check('reset() returns to solved', cube.score().solved)

// 10. Strict parsing for the manual algorithm box.
check('strict keeps legal tokens',
  parseAlgStrict("R U R' U2").map(formatMove).join(' ') === "R U R' U2")
check('strict drops junk tokens',
  parseAlgStrict('R nonsense U2 F! B2x').map(formatMove).join(' ') === 'R U2')
check('strict rejects bad suffixes', parseAlgStrict('U3 R0 F"').length === 0)
check('strict handles empty input', parseAlgStrict('   ').length === 0)

// 11. Manual takeover.
const drain = (d) => {
  let guard = 500
  while ((!d.idle || cube.busy) && guard-- > 0) {
    d.tick(1, cube, 0.01)
    cube.update(1)
  }
  return guard > 0
}

const m1 = new Director()
check('junk manual queues nothing', m1.manual({ face: 'X', amount: 1 }).length === 0)
check('junk manual leaves autoplay armed', m1.enabled === true)
m1.manual({ face: 'R', amount: 1 })
m1.manual(parseAlgStrict("U'"))
check('manual holds the loop', m1.enabled === false)
check('rapid manual calls append', m1.preview(4).join(' ') === "R U'")
check('manual phase labels the takeover', m1.phase.label === 'MANUAL')
check('manual queue drains', drain(m1))
check('R U\' leaves the cube disturbed', !cube.score().solved)
run(invertAlg(parseAlg("R U'")))
check('undoing the manual pair restores solved', cube.score().solved)

// A tracked scramble interrupted by a manual move still retraces to solved.
const m2 = new Director()
m2.load('SCRAMBLE', 'test', scramble(), { track: true })
for (let i = 0; i < 3; i++) { m2.tick(1, cube, 0.01); cube.update(1) }
m2.manual({ face: 'R', amount: 1 })
check('takeover drops the queued routine', m2.queue.length === 0)
check('takeover keeps the partial history', m2.history.length === 3)
check('takeover drains', drain(m2))
check('manual was tracked', m2.history.length === 4)
run(invertAlg(m2.history))
check('retrace after manual lands solved', cube.score().solved)

// Idle labels: MANUAL sticks while held, fresh directors report PAUSED.
const m3 = new Director()
m3.manual({ face: 'F', amount: 2 })
drain(m3)
run(parseAlg('F2'))
m3.tick(1, cube, 0.01)
check('MANUAL survives idle while held', m3.phase.label === 'MANUAL')
check('fresh paused director reports PAUSED', (() => {
  const d = new Director()
  d.enabled = false
  d.tick(1, cube, 0.01)
  return d.phase.label === 'PAUSED'
})())
check('cube left solved', cube.score().solved)

console.log(failures ? `\n${failures} FAILURES` : '\nall green')
process.exit(failures ? 1 : 0)
