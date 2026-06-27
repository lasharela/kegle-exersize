export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0 = Sunday (JS getDay)
export type ActivityType = 'kegel' | 'warmup' | 'strength' | 'run'

export interface StrengthExercise {
  key: string; name: string; mediaKey: string
  sets: number; startReps: number; perSide: boolean; rampStep: number; restSec: number
}
export interface WarmupMove { key: string; name: string; mediaKey: string; durationSec: number }

export const PROGRESSION = { sessionsToRamp: 7, defaultRestSec: 120 }
export const RUNNING = { startMinutes: 20, rampStepMinutes: 2 }

const R = PROGRESSION.defaultRestSec

export const STRENGTH_CIRCUIT: StrengthExercise[] = [
  { key: 'swing',         name: 'Kettlebell swing', mediaKey: 'kettlebell_swing', sets: 3, startReps: 15, perSide: false, rampStep: 3, restSec: R },
  { key: 'upright_row',   name: 'Upright row',      mediaKey: 'upright_row',      sets: 1, startReps: 12, perSide: false, rampStep: 2, restSec: R },
  { key: 'goblet_squat',  name: 'Goblet squat',     mediaKey: 'goblet_squat',     sets: 1, startReps: 12, perSide: false, rampStep: 2, restSec: R },
  { key: 'lunge',         name: 'Lunge',            mediaKey: 'lunge',            sets: 1, startReps: 8,  perSide: true,  rampStep: 1, restSec: R },
  { key: 'overhead_press',name: 'Overhead press',   mediaKey: 'overhead_press',   sets: 1, startReps: 10, perSide: false, rampStep: 2, restSec: R },
  { key: 'pushup',        name: 'Push-up',          mediaKey: 'pushup',           sets: 1, startReps: 5,  perSide: false, rampStep: 1, restSec: R },
  { key: 'bent_row',      name: 'Bent-over row',    mediaKey: 'bent_over_row',    sets: 1, startReps: 12, perSide: true,  rampStep: 2, restSec: R },
]

export const WARMUP: WarmupMove[] = [
  { key: 'arm_circles', name: 'Arm circles',       mediaKey: 'arm_circles',      durationSec: 30 },
  { key: 'band_pulls',  name: 'Band pull-aparts',  mediaKey: 'band_pull_apart',  durationSec: 40 },
  { key: 'bw_squats',   name: 'Bodyweight squats', mediaKey: 'bodyweight_squat', durationSec: 40 },
  { key: 'hip_openers', name: 'Hip openers',       mediaKey: 'hip_circle',       durationSec: 40 },
  { key: 'kb_halos',    name: 'Kettlebell halos',  mediaKey: 'kettlebell_halo',  durationSec: 40 },
]

export const WEEKLY_SCHEDULE: Record<Weekday, ActivityType[]> = {
  0: ['kegel'],
  1: ['kegel', 'run'],
  2: ['kegel', 'warmup', 'strength'],
  3: ['kegel', 'run'],
  4: ['kegel', 'warmup', 'strength'],
  5: ['kegel', 'run'],
  6: ['kegel', 'warmup', 'strength'],
}
