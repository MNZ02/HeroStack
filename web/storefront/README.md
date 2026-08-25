# storefront

The showcase. Browses every hero study in `web/`, previews it, and hands it
over. This is the only workspace here that isn't a study — everything else in
`web/` is product, this is the thing that showcases it.

```bash
npm run dev --workspace=storefront
# or
npx turbo run dev --filter=storefront
```

## Where the content lives

Two files, and nothing else needs editing to change what the site says:

| File | Holds |
| --- | --- |
| `src/data/studies.ts` | Every study — copy, stack, weight, preview path |
| `src/site.ts` | Brand name, blurb, contact |

`HEROSTACK` is the brand, and it lives in `site.ts` alone — change it there and
it changes everywhere.

Adding a study is: append to `STUDIES`, drop a preview in `public/previews/`,
done. Categories and the stats row derive themselves from the array, so they
can't fall out of sync with the actual catalogue.

## Previews are captured, not hot-linked

`public/previews/*.jpg` are real screenshots of the studies running locally,
self-hosted here. Roughly 170 KB each — 476 KB for all three.

Regenerating them is deliberately a manual step:

```bash
npx turbo run dev                      # studies on 5301/5302/5303
npm run previews --workspace=storefront
```

`scripts/capture-previews.mjs` drives headless Chrome, and the important part is
that it **moves the mouse before the shutter**. Every one of these studies hides
its effect behind pointer position — a cold screenshot catches the un-revealed
state, which is the boring half of each design. The coordinates in `SHOTS` are
tuned per study; adjust them if a layout moves.

It needs `puppeteer-core` and a local Chrome, neither of which is a dependency
of this workspace. Previews get regenerated rarely and by hand, and that isn't
worth a browser download on every `npm install`.

The upgrade path is short WebM loops instead of stills, since motion is the
thing being sold. That is worth doing properly — encode video, never GIF. A
competing library ships 21 animated GIFs totalling 175 MB on one page; the
equivalent WebM is under a megabyte.

## Build specs

The modal's **Copy build spec** button fetches from `public/prompts/<slug>.md`
and writes it to the clipboard. Only `comicraft.md` exists so far — it's a copy
of `web/comicraft/PROMPT.md`, and it is not kept in sync automatically. Re-copy
it when the source spec changes.

Studies with `prompt: null` render the button disabled and labelled rather than
hiding it, so the gap is visible instead of silently absent.

## Live demos

Each study runs for real, both embedded in the modal and full screen.

`npm run build:site` (from the repo root) builds the storefront, then builds
every study **into** `web/storefront/dist/studies/<slug>/` with a matching
`--base`. One tree, one deploy, no cross-origin anything:

```
web/storefront/dist/
  index.html                 the shop
  studies/comicraft/         live
  studies/vision-reveal/     live
  studies/aeris/             live
```

The `--base` is the whole trick. Vite rewrites its own emitted asset URLs, but
it will not touch an absolute path sitting inside a JS string or an inline
`style` attribute — so anything hard-coded to `/assets/…` 404s the moment it is
served from a subdirectory. Both offenders are fixed at the source:
`comicraft` builds its paths from `import.meta.env.BASE_URL`, and
`vision-reveal` references its frames relatively.

In the modal the demo is **opt-in** — the still is shown until you press *Run it
live*, because heavy media studies pull large asset payloads and nobody should pay
that just for opening a panel.

`demoUrl()` in `src/data/studies.ts` resolves to `/studies/<slug>/` in a
production build, and to a fixed localhost port in dev:

| Workspace | dev | preview |
| --- | --- | --- |
| storefront | 5300 | 5400 |
| comicraft | 5301 | 5401 |
| vision-reveal | 5302 | 5402 |
| aeris | 5304 | 5404 |
| lucifer | 5305 | 5405 |
| v8 | 5306 | 5406 |
| raptor | 5307 | 5407 |
| deep-sea-jellybot | 5308 | 5408 |

Those are pinned with `--strictPort` in each workspace's `dev` script, and the
pinning is what makes the map in `studies.ts` true. On Vite's default the four
servers race for 5173 upward and land in boot order, so the demo links would
point at whatever happened to answer — or nothing. `--strictPort` also means a
clash fails loudly instead of drifting silently, which is the failure mode that
made this worth pinning.

Change a port and you have to change it in two places: that workspace's
`package.json` and `DEV_PORTS`. They only answer while `npm run dev` is up.

## Requests

Study requests open a `mailto:` link.

## Deep links

The open study lives in the URL as `?study=<slug>`, pushed to history — so a
card is shareable and the browser back button closes the panel instead of
leaving the page. `Escape` and a backdrop click both close, and the body scroll
lock is released on unmount either way.
