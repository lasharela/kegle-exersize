import { WEEKLY_SCHEDULE } from './program'
import type { ActivityType, Weekday } from './program'
import type { ActivityLog } from './types'

/** Return the scheduled activities for a given ISO date string (YYYY-MM-DD). */
export function activitiesForDate(dateISO: string): ActivityType[] {
  const d = new Date(dateISO + 'T00:00:00')
  const weekday = d.getDay() as Weekday
  return WEEKLY_SCHEDULE[weekday]
}

/**
 * Return the ISO date string (YYYY-MM-DD) for the Monday that starts the week
 * containing the given date. Uses ISO week convention (Monday = first day).
 */
export function weekStartISO(dateISO: string): string {
  const d = new Date(dateISO + 'T00:00:00')
  const day = d.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
  // Offset to Monday: Sunday is 6 days back, otherwise (day - 1) days back
  const offsetDays = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - offsetDays)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

/**
 * Compute weekly progress given:
 *   - logs: ActivityLog[] for non-kegel activities
 *   - kegelDates: ISO date strings on which kegel was completed
 *   - weekStart: Monday ISO date of the current week
 *   - today: ISO date of today (inclusive upper bound)
 *
 * Formula (per day from weekStart..today):
 *   total += number of scheduled activities that day
 *   done  += (1 if kegelDates includes that day, else 0)
 *          + count of logs where log.date == day && log.type in scheduledNonKegel && log.completed
 */
export function weeklyProgress(args: {
  logs: ActivityLog[]
  kegelDates: string[]
  weekStart: string
  today: string
}): { done: number; total: number } {
  const { logs, kegelDates, weekStart, today } = args
  const kegelSet = new Set(kegelDates)

  let done = 0
  let total = 0

  // Iterate days from weekStart through today inclusive
  const cursor = new Date(weekStart + 'T00:00:00')
  const end = new Date(today + 'T00:00:00')

  while (cursor <= end) {
    const y = cursor.getFullYear()
    const m = String(cursor.getMonth() + 1).padStart(2, '0')
    const dd = String(cursor.getDate()).padStart(2, '0')
    const dateStr = `${y}-${m}-${dd}`

    const scheduled = activitiesForDate(dateStr)
    total += scheduled.length

    // kegel done
    if (kegelSet.has(dateStr)) done += 1

    // non-kegel scheduled activities completed
    const nonKegel = scheduled.filter((a) => a !== 'kegel')
    for (const actType of nonKegel) {
      const found = logs.some(
        (l) => l.date === dateStr && l.type === actType && l.completed,
      )
      if (found) done += 1
    }

    cursor.setDate(cursor.getDate() + 1)
  }

  return { done, total }
}
