import { STRENGTH_CIRCUIT, RUNNING } from './program'
import type { Profile } from './types'

export interface TrainingState {
  strength: Record<string, number>
  runMinutes: number
  levelStart: { strength: string; run: string }
}

export function defaultTrainingState(todayISO: string): TrainingState {
  const strength: Record<string, number> = {}
  for (const ex of STRENGTH_CIRCUIT) {
    strength[ex.key] = ex.startReps
  }
  return {
    strength,
    runMinutes: RUNNING.startMinutes,
    levelStart: { strength: todayISO, run: todayISO },
  }
}

export function parseTrainingState(profile: Profile, todayISO: string): TrainingState {
  const defaults = defaultTrainingState(todayISO)
  if (!profile.trainingState) return defaults
  try {
    const parsed = JSON.parse(profile.trainingState)
    if (typeof parsed !== 'object' || parsed === null) return defaults
    return {
      strength: { ...defaults.strength, ...(parsed.strength ?? {}) },
      runMinutes: parsed.runMinutes ?? defaults.runMinutes,
      levelStart: { ...defaults.levelStart, ...(parsed.levelStart ?? {}) },
    }
  } catch {
    return defaults
  }
}

export function currentReps(state: TrainingState, key: string): number {
  return state.strength[key]
}
