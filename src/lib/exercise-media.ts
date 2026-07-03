// Resolves a program `mediaKey` to a bundled looping MP4 in public/exercises/.
// We use MP4 video (not GIF) because iOS standalone PWAs render service-worker /
// standalone GIFs as a frozen first frame — looping muted <video> plays reliably.
// Unknown keys fall back to the app icon.

const MEDIA_KEYS = new Set([
  // strength circuit
  'kettlebell_swing',
  'upright_row',
  'goblet_squat',
  'lunge',
  'overhead_press',
  'pushup',
  'bent_over_row',
  'glute_bridge',
  // core
  'dead_bug',
  'front_plank',
  'side_plank',
  // warm-up
  'spine_twist',
  'lunge_twist',
  'squat_reach_twist',
  'glute_bridge_march',
  'mountain_climber',
])

const FALLBACK = '/icon-192.png'

// Exercises without a local video use start/end photo frames from the
// MIT-licensed free-exercise-db (via the jsDelivr CDN); ExerciseMedia
// alternates the two frames to suggest the movement.
const EXDB = 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises'
const IMAGE_KEYS: Record<string, string> = {
  kb_deadlift: 'Sumo_Deadlift', // same hinge pattern, weight between the legs
  suitcase_carry: 'Farmers_Walk',
  band_pullapart: 'Band_Pull_Apart',
}

export function imageFrames(mediaKey: string): [string, string] | null {
  const id = IMAGE_KEYS[mediaKey]
  return id ? [`${EXDB}/${id}/0.jpg`, `${EXDB}/${id}/1.jpg`] : null
}

export function hasVideo(mediaKey: string): boolean {
  return MEDIA_KEYS.has(mediaKey)
}

export function mediaUrl(mediaKey: string): string {
  return MEDIA_KEYS.has(mediaKey) ? `/exercises/${mediaKey}.mp4` : FALLBACK
}

// Same demo as an animated GIF — the fallback when <video> won't start
// (Cloudflare Workers assets serve no Range support, which iOS video requires).
export function gifUrl(mediaKey: string): string {
  return `/exercises/${mediaKey}.gif`
}

// The static hosting ignores Range requests, so iOS refuses to stream the
// mp4s directly. The clips are ~10 KB: fetch fully, play from a blob URL
// (no ranges involved). Cached per key for the app's lifetime.
const blobCache = new Map<string, Promise<string | null>>()

export function videoBlobUrl(mediaKey: string): Promise<string | null> {
  let p = blobCache.get(mediaKey)
  if (!p) {
    p = fetch(mediaUrl(mediaKey))
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
      .then((b) => URL.createObjectURL(b))
      .catch(() => null)
    blobCache.set(mediaKey, p)
  }
  return p
}
