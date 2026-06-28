// Resolves a program `mediaKey` to a bundled animated demo GIF in
// public/exercises/. Every strength + warm-up move uses the same consistent
// ExerciseDB-style figure (non-commercial dataset; fine for personal use).
// Unknown keys fall back to the app icon.

const GIF_KEYS = new Set([
  // strength circuit
  'kettlebell_swing',
  'upright_row',
  'goblet_squat',
  'lunge',
  'overhead_press',
  'pushup',
  'bent_over_row',
  'glute_bridge',
  // warm-up
  'world_greatest_stretch',
  'band_reverse_fly',
  'glute_bridge_march',
  'inchworm',
  'mountain_climber',
])

const FALLBACK = '/icon-192.png'

export function mediaUrl(mediaKey: string): string {
  return GIF_KEYS.has(mediaKey) ? `/exercises/${mediaKey}.gif` : FALLBACK
}
