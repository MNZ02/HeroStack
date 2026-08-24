# Raptor Cutaway

A SpaceX Raptor methalox engine — full-flow staged combustion — generated
procedurally in three.js, no model file, no asset pipeline. Orbit it, set the
throttle, and strip it in an *exploded* cutaway: the feed network and twin
preburner/turbopump modules lift clear, the bell nozzle drops away, the cooling
jacket strips and the chamber ghosts translucent so the injector plate and the
burn show through it, then down to a bare hot section with a glowing throat.

Every layer both fades *and* translates away along the engine axis, so the
stripped shells stay visible in the periphery while the inner core is revealed.

```bash
npm run dev       # http://localhost:5307
npm run build
```

Everything is `src/raptor.ts`. The bell, throat and chamber are a single surface
of revolution built with `LatheGeometry`; the two preburner/turbopump modules are
FK-ish assemblies hanging off the sides behind tubes. Throttling the engine spins
the turbopumps and drives the chamber glow — the flame is a translucent emissive
volume with a hot core, a cool blue oxidizer crown and bright shock diamonds down
the column. A point light inside the chamber warms the liner and injector as the
burn ramps up.

Five layers share one hierarchy, so stripping the bell without the loops is done
through a per-layer material registry rather than a scene-graph group — that's
what lets a single group hold cooling-jacket, chamber and internals and still
fade independently. Gas-like materials carry their own `baseOpacity` so a
translucent flame can live inside an otherwise opaque layer.

`src/main.ts` owns the scene, the lighting, the orbit controls and the exploded
layer tweening. `scripts/shot.mjs` captures the study with headless Chrome
(needs `puppeteer-core` and Chrome) for regenerating the storefront preview.
