import type { Exercise, Profile, ActivityLog } from './types'
import { nextTarget } from './levels'
import { PROGRESSION } from './program'
import type { ActivityType } from './program'

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

/**
 * Count the number of DISTINCT dates in logs where the log is completed,
 * matches the given activity type, and the date is >= sinceISO.
 */
export function consistentSessions(
  logs: ActivityLog[],
  opts: { type: ActivityType; sinceISO: string },
): number {
  const days = new Set<string>()
  for (const l of logs) {
    if (!l.completed) continue
    if (l.type !== opts.type) continue
    if (l.date < opts.sinceISO) continue
    days.add(l.date)
  }
  return days.size
}

/**
 * Returns true when the user has accumulated enough consistent sessions
 * (>= PROGRESSION.sessionsToRamp) to earn a ramp in difficulty.
 */
export function shouldRamp(
  logs: ActivityLog[],
  opts: { type: ActivityType; sinceISO: string },
): boolean {
  return consistentSessions(logs, opts) >= PROGRESSION.sessionsToRamp
}
