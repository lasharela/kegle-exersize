// Resolves a program `mediaKey` to a demo image from the MIT-licensed
// free-exercise-db (https://github.com/yuhonas/free-exercise-db), served via CDN.
// IDs were matched to our movements and verified to return 200 (start-position
// frame `/0.jpg`). Unmapped keys fall back to the app icon.

const BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises'

// mediaKey -> free-exercise-db exercise id
const ID_MAP: Record<string, string> = {
  // strength circuit
  kettlebell_swing: 'One-Arm_Kettlebell_Swings',
  upright_row: 'Standing_Dumbbell_Upright_Row',
  goblet_squat: 'Goblet_Squat',
  lunge: 'Dumbbell_Lunges',
  overhead_press: 'Dumbbell_Shoulder_Press',
  pushup: 'Pushups',
  bent_over_row: 'Bent_Over_Two-Dumbbell_Row',
  // warm-up
  band_pull_apart: 'Band_Pull_Apart',
  bodyweight_squat: 'Bodyweight_Squat',
  arm_circles: 'Arm_Circles',
  hip_circle: 'Standing_Hip_Circles',
  kettlebell_halo: 'Around_The_Worlds', // closest available to a kettlebell halo
}

const FALLBACK = '/icon-192.png'

export function mediaUrl(mediaKey: string): string {
  const id = ID_MAP[mediaKey]
  return id ? `${BASE}/${id}/0.jpg` : FALLBACK
}
