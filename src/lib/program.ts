export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0 = Sunday (JS getDay)
export type ActivityType = 'kegel' | 'warmup' | 'strength' | 'run'

export interface StrengthExercise {
  key: string; name: string; mediaKey: string
  sets: number; startReps: number; perSide: boolean; rampStep: number; restSec: number
  isHold?: boolean // isometric hold — `startReps` is seconds, displayed "Ns hold"
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
  { key: 'glute_bridge',  name: 'Weighted glute bridge', mediaKey: 'glute_bridge', sets: 1, startReps: 12, perSide: false, rampStep: 2, restSec: R },
  // Core finisher (back-safe, anti-movement). Planks are holds (startReps = seconds).
  { key: 'dead_bug',      name: 'Dead bug',    mediaKey: 'dead_bug',    sets: 1, startReps: 8,  perSide: true,  rampStep: 1, restSec: R },
  { key: 'front_plank',   name: 'Front plank', mediaKey: 'front_plank', sets: 1, startReps: 30, perSide: false, rampStep: 5, restSec: R, isHold: true },
  { key: 'side_plank',    name: 'Side plank',  mediaKey: 'side_plank',  sets: 1, startReps: 20, perSide: true,  rampStep: 5, restSec: R, isHold: true },
]

// Animated warm-up (same GIF style as the strength circuit). Mobility -> activation
// -> light cardio; uses the TRX band and includes glute/pelvic activation.
export const WARMUP: WarmupMove[] = [
  { key: 'wgs',         name: "World's greatest stretch", mediaKey: 'world_greatest_stretch', durationSec: 40 },
  { key: 'band_fly',    name: 'Band reverse fly',         mediaKey: 'band_reverse_fly',       durationSec: 40 },
  { key: 'glute_march', name: 'Glute bridge march',       mediaKey: 'glute_bridge_march',     durationSec: 40 },
  { key: 'inchworm',    name: 'Inchworm',                 mediaKey: 'inchworm',               durationSec: 40 },
  { key: 'mtn_climber', name: 'Mountain climber',         mediaKey: 'mountain_climber',       durationSec: 30 },
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
