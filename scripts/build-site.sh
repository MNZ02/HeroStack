#!/usr/bin/env bash
#
# Assembles the whole thing into one deployable directory:
#
#   web/storefront/dist/                 the shop
#   web/storefront/dist/studies/<slug>/  each study, live
#
# Studies build straight into the storefront's dist rather than being copied
# afterwards, so there is only ever one tree and no stale leftovers. Each is
# built with a --base matching where it will be mounted; anything referencing
# an asset by absolute path would otherwise 404 under the subpath.
#
#   npm run build:site
#   npx serve web/storefront/dist      # or any static host
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/web/storefront/dist"

# Keep in sync with `demo` in web/storefront/src/data/studies.ts.
STUDIES=(raptor comicraft vision-reveal prmpt aeris lucifer v8 deep-sea-jellybot)

echo "==> storefront"
npx turbo run build --filter=storefront

for slug in "${STUDIES[@]}"; do
  echo "==> $slug -> /studies/$slug/"
  # Called through vite directly: `npm run build` in some workspaces chains a
  # tsc pass with &&, and appending flags to that is fragile. Type checking
  # already happened in the turbo build above.
  (
    cd "$ROOT/web/$slug"
    npx vite build \
      --base "/studies/$slug/" \
      --outDir "$OUT/studies/$slug" \
      --emptyOutDir
  )
done

echo
echo "Built $ROOT/web/storefront/dist"
du -sh "$OUT"
