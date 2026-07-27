#!/usr/bin/env bash
#
# Publish the master hero art to Cloudinary.
#
# Only the two full-quality PNG masters go up. Every delivered format (WebP,
# JPEG, any future size) is derived from them by Cloudinary at request time,
# so there is exactly one source of truth per grade and re-encoding never
# needs another upload.
#
# Uploads are signed, so this needs the API secret. Read delivery stays public
# — the hero has to render for every visitor.
#
#   export CLOUDINARY_URL='cloudinary://<api_key>:<api_secret>@<cloud_name>'
#   ./scripts/upload-assets.sh
#   DRY_RUN=1 ./scripts/upload-assets.sh    # show the plan, upload nothing
#
set -euo pipefail

FOLDER="${FOLDER:-comicraft}"
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/assets-src"
DRY_RUN="${DRY_RUN:-}"

# CLOUDINARY_URL is the single-variable form the official SDKs also read.
if [[ -n "${CLOUDINARY_URL:-}" ]]; then
  rest="${CLOUDINARY_URL#cloudinary://}"
  API_KEY="${rest%%:*}"
  rest="${rest#*:}"
  API_SECRET="${rest%%@*}"
  CLOUD_NAME="${rest#*@}"
else
  CLOUD_NAME="${CLOUDINARY_CLOUD_NAME:-}"
  API_KEY="${CLOUDINARY_API_KEY:-}"
  API_SECRET="${CLOUDINARY_API_SECRET:-}"
fi

if [[ -z "$DRY_RUN" && ( -z "${CLOUD_NAME:-}" || -z "${API_KEY:-}" || -z "${API_SECRET:-}" ) ]]; then
  cat >&2 <<'EOF'
Missing credentials. Set CLOUDINARY_URL, which you can copy from the
Cloudinary dashboard (Settings -> API Keys):

  export CLOUDINARY_URL='cloudinary://<api_key>:<api_secret>@<cloud_name>'

Never commit this value. It grants write access to the whole account.
EOF
  exit 1
fi

echo "cloud:  ${CLOUD_NAME:-<unset>}"
echo "folder: $FOLDER"
echo "source: $SRC"
echo

for file in hero-bg.png hero-bg-bnw.png; do
  path="$SRC/$file"
  [[ -f "$path" ]] || { echo "missing: $path" >&2; exit 1; }

  public_id="$FOLDER/${file%.png}"
  timestamp="$(date +%s)"

  printf '%-18s -> %s\n' "$file" "$public_id"
  [[ -n "$DRY_RUN" ]] && continue

  # Signature: the signed params, sorted by key, joined with &, then the
  # secret appended, SHA-1 hex. Keep this list in sync with the -F flags below.
  to_sign="invalidate=true&overwrite=true&public_id=${public_id}&timestamp=${timestamp}"
  signature="$(printf '%s%s' "$to_sign" "$API_SECRET" | openssl dgst -sha1 | awk '{print $NF}')"

  curl -fsS -X POST \
    "https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload" \
    -F "file=@${path}" \
    -F "public_id=${public_id}" \
    -F "timestamp=${timestamp}" \
    -F "overwrite=true" \
    -F "invalidate=true" \
    -F "api_key=${API_KEY}" \
    -F "signature=${signature}" \
    | tr ',' '\n' | grep -E '"(secure_url|version|bytes|format|width|height)"' || true

  echo
done

cloud_display="${CLOUD_NAME:-<cloud_name>}"
base="https://res.cloudinary.com/${cloud_display}/image/upload"

cat <<EOF

Done. Delivery URLs — the four the prompt fetches:

  ${base}/f_webp,q_88/${FOLDER}/hero-bg.webp
  ${base}/f_jpg,q_84/${FOLDER}/hero-bg.jpg
  ${base}/f_webp,q_82/${FOLDER}/hero-bg-bnw.webp
  ${base}/f_jpg,q_82/${FOLDER}/hero-bg-bnw.jpg

Masters, for regenerating anything:

  ${base}/${FOLDER}/hero-bg.png
  ${base}/${FOLDER}/hero-bg-bnw.png

Put "${cloud_display}" into PROMPT.md as {{CLOUD_NAME}}.
EOF
