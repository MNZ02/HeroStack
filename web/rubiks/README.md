# Cube Engine

A 3×3 Rubik's cube in three.js that plays itself: scramble, retrace, pattern,
restore, forever. Every facelet is its own procedurally drawn plate, and the
console around it reads the cube's state back off the geometry.

```bash
npm run dev --workspace=rubiks    # http://localhost:5310
```

`Autoplay` (or space) holds the loop, `Scramble` / `Retrace` / `Pattern` jump
straight to a routine, the speed slider runs 0.35× to 3×, and dragging orbits —
auto-cam resumes two seconds after you let go.

## Manual play

The `PLAY` bar turns the cube by hand, and autoplay stays available:

- Face pad: `U U' U2` through `B B' B2`, grouped and colour-coded per face.
- Algorithm box: type `R U R' U'` and hit `Queue alg` (Enter). Anything that
  is not a legal token is ignored; empty input flashes the box.
- Keyboard: `U D L R F B` turn clockwise, `shift` adds the prime
  (`Shift+R` is `R'` — press twice for a double), `z` undoes the last
  settled turn. Typing in the algorithm box is never hijacked.
- `Undo` inverts the last turn that actually landed.

Any manual move takes over: it holds the autoplay loop (the `Autoplay`
button goes dark — press it or space to resume) and drops the queued
routine so your move plays next. The HUD panel reads `MANUAL` while you
hold the cube. Moves made while a scramble or pattern is being recorded
are tracked, so `Retrace` afterwards still lands solved.

One shortcut moved to make room: the `r` key is the `R` face now, so
retrace-by-keyboard is `t` (`s` scramble and `p` pattern are unchanged).

While autoplay runs, a pulsing `AUTOPLAY` pill and a one-time hint over the
viewport invite the takeover; both retire once you play, and the pill reads
`YOU PLAY` while you hold the cube.

## The turn engine

A turn re-parents the nine cubies of a layer onto a pivot group, spins the pivot,
then folds the pivot's matrix into each cubie and hands it back to the cube group:

```js
pivot.updateMatrix()
for (const cubie of members) {
  cubie.applyMatrix4(pivot.matrix)   // pivot's rotation, baked into the cubie
  group.add(cubie)
  snap(cubie)
}
```

`snap` is the part that matters. Every turn is a multiple of 90°, so the cubie's
position rounds to the integer lattice and its rotation basis rounds to ±1
element-wise. Without it, floating-point residue accumulates and after a few
thousand turns the layer selection — `Math.round(cubie.position[axis]) === layer`
— starts picking up the wrong cubies. With it, drift is exactly zero; the test
below runs 1,856 turns and the maximum lattice error stays at 0.

Each move eases with a slight overshoot (`easeOutBack`, ~6%), so a turn arrives
just past 90° and settles. That is most of why it reads as a physical cube
rather than a lerp.

### No shadow state

There is no permutation array. `readFacelets()` derives the whole state from the
real transforms — each plate's world normal picks the face, its position picks
the cell — which is what the HUD map, the solved-face count and the solved check
all consume. A panel that disagreed with the cube would be a bug you could see,
so there is nothing to keep in sync.

## Autoplay

The director runs a four-beat loop:

| beat | what it does |
| --- | --- |
| `SCRAMBLE` | 20 random quarter turns, no repeated face and no `A B A` on an axis |
| `RETRACE SOLVE` | the scramble inverted and replayed backwards |
| `PATTERN` | one of six classic algorithms, applied from solved |
| `RESTORE` | that algorithm's inverse |

**The solve is a retrace, not a search.** A real solver (Kociemba, or
layer-by-layer) would find a ~20-move answer from any state; this replays the
scramble backwards, so it always takes exactly as many moves as the scramble
did. That is a deliberate trade — the study is about the turn engine and the
plates — and the HUD names the routine `RETRACE SOLVE` rather than pretending
otherwise. Swapping in a real solver only means feeding a different move list to
the same queue.

Patterns cycle checkerboard, cube-in-a-cube, six spots, tetris, anaconda and the
20-move superflip.

## Plate artwork

Each of the 54 facelets gets its own 256² canvas: the face's motif — engineering
grid, halftone, circuit traces, scope waves, sunburst, target rings — plus a
speckle pass and its own serial (`R-04`, `U-07`). Six shared textures would have
been cheaper, but then a turn would only shuffle blocks of colour; per-plate
serials make individual pieces trackable by eye. 54 textures at 256² is about
14 MB of VRAM.

The plates carry transparent rounded corners, so they mount on the dark cubie
body as `alphaTest: 0.5` planes 3 thousandths proud of a `RoundedBoxGeometry` —
no extra geometry for the bevel, and no sorting cost from real transparency.

Lighting is `RoomEnvironment` prefiltered through PMREM (procedural, not an
asset) plus a hard key for the contact shadow. Nothing is loaded over the
network; the whole cube is code.

## Tests

The turn engine is verified headlessly — canvas stubbed, three.js run in node:

```bash
node scripts/cube-test.mjs
```

It checks the notation, that `X×4`, `X X'` and `X2 X2` are identity on all six
faces, that `(R U R' U')×6` returns to solved, that every canned pattern both
disturbs the cube and is undone by its inverse, that the superflip leaves exactly
30 facelets home (6 centres + 24 corner facelets — the definition of the
pattern), and that 40 random scramble/retrace cycles land solved with zero
lattice drift.
