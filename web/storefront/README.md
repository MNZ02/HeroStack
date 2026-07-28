# storefront

The shop window. Browses every hero study in `web/`, previews it, and hands it
over. This is the only workspace here that isn't a study — everything else in
`web/` is product, this is the thing that sells it.

```bash
npm run dev --workspace=storefront
# or
npx turbo run dev --filter=storefront
```

## Where the content lives

Two files, and nothing else needs editing to change what the site says:

| File | Holds |
| --- | --- |
| `src/data/studies.ts` | Every study — copy, stack, weight, tier, preview path |
| `src/site.ts` | Brand name, blurb, contact, pricing tiers |

`HEROSTACK` is a working title sitting in `site.ts`, not a decision. Rename it
there and it changes everywhere.

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

## What is deliberately not wired

- **Checkout.** Every pricing and study CTA opens a `mailto:`. No payment
  processor, no card fields, nothing that pretends to take money.
- **Live demos.** `demo` is `null` on every study until each workspace has a
  deployed home. The modal states that plainly instead of dead-linking.

Both are single-field changes in `studies.ts` / `site.ts` once the backing
infrastructure exists.

## Deep links

The open study lives in the URL as `?study=<slug>`, pushed to history — so a
card is shareable and the browser back button closes the panel instead of
leaving the page. `Escape` and a backdrop click both close, and the body scroll
lock is released on unmount either way.
