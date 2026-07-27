# motionsite-clone

A Turborepo of motion-led site rebuilds. Each study is a standalone workspace
under `web/`; nothing is shared between them yet.

```
web/
  comicraft/     Comicraft Studio — samurai-themed portfolio hero
packages/        shared code, once two projects actually need the same thing
```

## Getting started

```bash
npm install          # once, at the root — workspaces hoist from here
npm run dev          # every app in the repo
npm run build
npm run lint
```

To work on one project, filter it:

```bash
npx turbo run dev --filter=comicraft
npx turbo run build --filter=comicraft
```

Or just run it directly:

```bash
npm run dev --workspace=comicraft
```

Requires Node 20+ (`.nvmrc` pins the version this was built against).

## Projects

### `web/comicraft`

Samurai-themed portfolio hero — full-bleed cinematic scene, GSAP load timeline,
scroll and pointer parallax, and a cursor-following lens that reveals a
black-and-white grade of the same frame in perfect registration.

Its own `README.md` covers the design tokens and the non-obvious bits of the
hero. `PROMPT.md` is a complete spec that rebuilds it 1:1 from scratch, and
`ASSETS.md` is the runbook for the Cloudinary account the art is served from.

## Conventions

- **npm workspaces**, not pnpm or yarn. The root holds the only lockfile.
- **Turborepo caches `build` and `lint`.** `dev` and `preview` are marked
  persistent and uncached. `.turbo/` is gitignored.
- **New project?** Drop it in `web/<name>`, give its `package.json` a real name
  (never `project-2`), and make sure it exposes `dev`, `build`, `lint` and
  `clean` scripts so the root tasks pick it up with no further wiring.
- **Never commit credentials.** `.env*` is ignored at the root. The Cloudinary
  API secret belongs in your shell profile or a CI secret store — see
  `web/comicraft/ASSETS.md`.
