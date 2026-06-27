import type { Exercise, Profile } from './types'
import { nextTarget } from './levels'

// Distinct days of completing the full target required to unlock the next level.
export const DAYS_TO_LEVEL_UP = 7

// Distinct days the user completed their current target since reaching this level.
// "Reaching this level" is marked by Profile.weekStartDate, re-stamped on every level change.
export function daysCompletedThisLevel(exercises: Exercise[], profile: Profile): number {
  const days = new Set<string>()
  for (const e of exercises) {
    if (!e.completed) continue
    if (e.targetPulses !== profile.currentTarget) continue
    if (e.date < profile.weekStartDate) continue
    days.add(e.date)
  }
  return days.size
}

export function canLevelUp(exercises: Exercise[], profile: Profile): boolean {
  if (nextTarget(profile.currentTarget) === null) return false
  return daysCompletedThisLevel(exercises, profile) >= DAYS_TO_LEVEL_UP
}
