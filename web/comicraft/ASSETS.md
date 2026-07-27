# Hero art — hosting runbook

Cloudinary. **Public read, locked-down write.** No domain required, which is
why it was chosen over Cloudflare R2 here.

Be clear about what that does and does not buy you. The hero image is fetched
by every visitor's browser before any script runs, so it is public by
construction — anyone who can load the page can save the file, and no host
changes that. What is actually secured:

| Concern | How |
| --- | --- |
| Who can replace or delete the art | Signed uploads only; the API secret never leaves your machine or CI secret store. |
| Anonymous writes into your account | No unsigned upload presets (step 4). This is the one real foot-gun. |
| Your account used as a free image CDN | Strict transformations, so only derivations you have approved are served (step 5). |
| Tampering in transit | HTTPS; Cloudinary delivery is TLS-only. |
| Stale cache after a re-upload | `invalidate=true` on upload, which the script already sends. |

## What gets stored

Only the two full-quality PNG masters. Every delivered format — WebP, JPEG,
any size you want later — is derived from them by Cloudinary at request time.
One source of truth per grade, and a new format never means a new upload.

| Master | Public ID | Bytes |
| --- | --- | --- |
| `assets-src/hero-bg.png` | `comicraft/hero-bg` | 1.73MB |
| `assets-src/hero-bg-bnw.png` | `comicraft/hero-bg-bnw` | 1.87MB |

`assets-src/` is gitignored — Cloudinary is the durable copy.

---

## 1. Create the account

<https://cloudinary.com/users/register_free>. The free tier is 25 monthly
credits (storage + transformations + bandwidth combined); this project uses a
rounding error of that. No card required.

Note your **cloud name** from the dashboard — it appears in every delivery URL
and is not a secret.

## 2. Get the API credentials

**Settings → API Keys**. Copy the `CLOUDINARY_URL` shown there, which packs all
three values into one string:

```bash
export CLOUDINARY_URL='cloudinary://<api_key>:<api_secret>@<cloud_name>'
```

The API secret is a **write credential for the whole account**. Never commit
it, never put it in client-side code, never paste it into the prompt. Keep it
in your shell profile or a CI secret store. `.gitignore` already excludes
`.env*`.

## 3. Upload

```bash
DRY_RUN=1 ./scripts/upload-assets.sh    # preview
./scripts/upload-assets.sh              # upload
```

The script signs each request with SHA-1 over the sorted parameters plus your
secret — the same scheme the official SDKs use — and prints the delivery URLs
when it finishes.

## 4. Close off unsigned uploads

**Settings → Upload → Upload presets.** If any preset has *Signing mode:
Unsigned*, either delete it or switch it to Signed.

This matters more than anything else here. An unsigned preset lets anyone who
learns its name — it travels in client-side code by design — upload into your
account without credentials. It is the standard way Cloudinary accounts get
abused. A fresh account may ship with one (`ml_default`) already enabled.

## 5. Restrict transformations

**Settings → Security → Strict transformations.** With this on, Cloudinary only
serves derived URLs you have explicitly allowed, so nobody can point
`.../w_4000,e_art:hokusai/...` at your assets and bill your account for it.

The catch: it also blocks the four derivations this project needs until you
allow them. After enabling, open each of the four URLs once from
**Media Library → the asset → Transformations**, or add them to the allow-list,
then re-run the verification in step 6.

If that is more ceremony than you want right now, leave strict transformations
off — the exposure is bandwidth, not data — but do not skip step 4.

## 6. Verify

Substitute your cloud name:

```bash
CLOUD=<cloud_name>
for u in \
  "f_webp,q_88/comicraft/hero-bg.webp" \
  "f_jpg,q_84/comicraft/hero-bg.jpg" \
  "f_webp,q_82/comicraft/hero-bg-bnw.webp" \
  "f_jpg,q_82/comicraft/hero-bg-bnw.jpg" ; do
  curl -sI "https://res.cloudinary.com/$CLOUD/image/upload/$u" \
    | grep -iE 'HTTP/|content-type|content-length'
done
```

Expect `200`, the right `content-type`, and roughly 100–170KB each. The first
request for a derivation is slow — Cloudinary is generating it — and every
request after is cached.

Then confirm writes are actually closed. This must **fail** with an
authentication error:

```bash
curl -X POST "https://api.cloudinary.com/v1_1/$CLOUD/image/upload" \
  -F "file=@assets-src/hero-bg.png" -F "upload_preset=ml_default"
```

If that *succeeds*, you have an unsigned preset enabled — go back to step 4.

## 7. Fill in the prompt

`PROMPT.md` has one placeholder, `{{CLOUD_NAME}}`, in three places.

---

## Serving the site

This runbook covers *distribution* — how someone running `PROMPT.md` obtains
the art. The deployed site should still serve the hero from its own origin out
of `public/assets/`, which is what the code does today. Same-origin is faster
(no extra DNS + TLS handshake in front of the LCP image) and the site keeps
working if the Cloudinary account lapses.

Point the site at Cloudinary only if you start serving several sizes, or want
to change the art without redeploying. If you do, use `f_auto,q_auto` rather
than the pinned `f_webp,q_88` above, so browsers that support AVIF get it.
