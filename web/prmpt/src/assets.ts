/**
 * Every remote asset the page depends on, in one place.
 *
 * These are third-party URLs carried over from the source spec — the videos sit
 * on someone else's CloudFront bucket and the stills are proxied through
 * images.higgs.ai. Nothing here is ours and nothing here is pinned, so treat it
 * as borrowed: the day either host rotates a key or prunes a bucket, the page
 * goes blank. Swapping to self-hosted files should mean editing this file only.
 */

const CDN = 'https://d8j0ntlcm91z4.cloudfront.net'
const VIDEO_USER = 'user_39ca84eAE1ODL9hbR5VhoEj8tBf'
const IMAGE_USER = 'user_38xzZboKViGWJOttwIXH07lWA1P'

/** Proxied through higgs.ai for webp transcoding + resizing. */
const still = (name: string, width = 1920, quality = 85) =>
  `https://images.higgs.ai/?default=1&output=webp&url=${encodeURIComponent(
    `${CDN}/${IMAGE_USER}/${name}.png`,
  )}&w=${width}&q=${quality}`

export const VIDEO_LEFT = `${CDN}/${VIDEO_USER}/hf_20260625_154433_532a85d3-dabf-4265-b8bd-19ac6af31842.mp4`
export const VIDEO_RIGHT = `${CDN}/${VIDEO_USER}/hf_20260625_154401_a664f076-b971-4557-8728-40ef9ea4c49b.mp4`

export const GALLERY: readonly string[] = [
  'hf_20260629_104530_521b2f85-c0f3-4d0e-9704-b578315b4cb9',
  'hf_20260629_103711_76ccdb8b-5043-4f47-9c54-4379713393ea',
  'hf_20260629_103728_394f6a1b-85e2-4386-a4f6-408472a0a5b7',
  'hf_20260629_103739_86743e0e-16a7-4bee-bf38-dd67985344dc',
  'hf_20260629_103748_b2215dc8-a3a7-470d-b19a-5b87fa7d0c37',
  'hf_20260629_103758_e919ce72-5c9d-4b87-9be6-d7647b34825c',
  'hf_20260629_103808_013583d0-3386-4547-9832-37c7d8edb3ac',
  'hf_20260629_103937_a0c49d0a-33eb-4ead-aea6-c1baf241acbc',
  'hf_20260629_103956_d18ed8fd-7b6f-4b86-91f9-20010fe38670',
  'hf_20260629_104034_ba5a9963-87ff-4008-a545-6bd686c088b5',
].map((name) => still(name))
