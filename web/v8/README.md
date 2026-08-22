# V8 Cutaway

A running cross-plane V8 built procedurally in three.js. Orbit around it, rev it,
and strip it layer by layer: intake and valve covers, heads and pan, a ghosted
block, down to the bare rotating assembly — crank throws at 0/90/270/180° with
full slider-crank piston motion.

```bash
npm run dev       # http://localhost:5306
npm run build
```

No assets — every part is generated geometry (`src/engine.ts`), animated by real
crank kinematics in `src/main.ts`.
