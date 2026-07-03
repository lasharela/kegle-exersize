// All-activity streak with shield bridging (pure, tested).
//
// A day is "complete" when every activity scheduled for it is done. Days before
// STREAK_EPOCH only require kegel (activity logs didn't persist back then).
// The current streak is the run of consecutive complete-or-shielded days ending
// today — or yesterday, so an in-progress today never zeroes the streak.
// A gap of N missed days is bridged by consuming N shields, but only when the
// day beyond the gap is itself part of the streak (never waste shields on a
// dead streak). Consumption is returned to the caller to persist.

import { activitiesForDate } from './schedule'
import { STREAK_EPOCH } from './program'
import type { ActivityLog } from './types'

function prevDateISO(dateISO: string): string {
  const d = new Date(dateISO + 'T00:00:00')
  d.setDate(d.getDate() - 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export function isDayComplete(date: string, kegelDates: Set<string>, logs: ActivityLog[]): boolean {
  if (date < STREAK_EPOCH) return kegelDates.has(date)
  return activitiesForDate(date).every((a) =>
    a === 'kegel'
      ? kegelDates.has(date)
      : logs.some((l) => l.date === date && l.type === a && l.completed),
  )
}

const MAX_DAYS = 365

export function computeStreak(args: {
  kegelDates: Set<string>
  logs: ActivityLog[]
  shieldsUsed: string[]
  shieldsOwned: number
  today: string
}): { streak: number; consume: string[] } {
  const { kegelDates, logs, shieldsUsed, shieldsOwned, today } = args
  const shielded = new Set(shieldsUsed)
  const complete = (d: string) => isDayComplete(d, kegelDates, logs)

  let streak = 0
  const consume: string[] = []
  let shieldsLeft = shieldsOwned

  // An in-progress today doesn't break the chain — start there only if done.
  let day = complete(today) ? today : prevDateISO(today)

  for (let i = 0; i < MAX_DAYS; i++) {
    if (complete(day) || shielded.has(day)) {
      streak++
      day = prevDateISO(day)
      continue
    }

    // Gap: measure the run of missed, unshielded days.
    const gap: string[] = []
    let probe = day
    while (gap.length <= shieldsLeft && !complete(probe) && !shielded.has(probe)) {
      gap.push(probe)
      probe = prevDateISO(probe)
      if (gap.length > MAX_DAYS) break
    }

    // Bridge only if we can afford it AND the streak continues beyond the gap.
    if (gap.length <= shieldsLeft && (complete(probe) || shielded.has(probe))) {
      consume.push(...gap)
      shieldsLeft -= gap.length
      streak += gap.length
      day = probe
      continue
    }

    break
  }

  return { streak, consume }
}
