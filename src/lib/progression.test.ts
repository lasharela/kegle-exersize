import { describe, it, expect } from 'vitest'
import { daysCompletedThisLevel, canLevelUp, DAYS_TO_LEVEL_UP, consistentSessions, shouldRamp } from './progression'
import type { Exercise, Profile, ActivityLog } from './types'

function profile(over: Partial<Profile> = {}): Profile {
  return {
    $id: 'p', userId: 'u', initials: 'AB', totalPoints: 0, shieldsOwned: 0,
    shieldsUsed: [], currentWeek: 1, currentTarget: 100, pulseInterval: 1.5,
    reminderTime: '09:00', notificationsEnabled: false, unlockedBadges: [],
    weekStartDate: '2026-06-01', totalPulses: 0, ...over,
  }
}

function ex(over: Partial<Exercise>): Exercise {
  return {
    $id: 'e', userId: 'u', date: '2026-06-02', completed: true,
    pulsesCompleted: 100, targetPulses: 100, pointsEarned: 1,
    startTime: '', shieldUsed: false, ...over,
  }
}

describe('daysCompletedThisLevel', () => {
  it('counts distinct days completed at the current target since weekStartDate', () => {
    const p = profile({ currentTarget: 100, weekStartDate: '2026-06-01' })
    const exercises = [
      ex({ date: '2026-06-02' }),
      ex({ date: '2026-06-03' }),
      ex({ date: '2026-06-03' }), // same day -> counts once
    ]
    expect(daysCompletedThisLevel(exercises, p)).toBe(2)
  })

  it('ignores completions before weekStartDate', () => {
    const p = profile({ weekStartDate: '2026-06-05' })
    const exercises = [ex({ date: '2026-06-02' }), ex({ date: '2026-06-06' })]
    expect(daysCompletedThisLevel(exercises, p)).toBe(1)
  })

  it('ignores incomplete sessions and sessions at a different target', () => {
    const p = profile({ currentTarget: 100, weekStartDate: '2026-06-01' })
    const exercises = [
      ex({ date: '2026-06-02', completed: false }),
      ex({ date: '2026-06-03', targetPulses: 150 }),
      ex({ date: '2026-06-04' }),
    ]
    expect(daysCompletedThisLevel(exercises, p)).toBe(1)
  })
})

describe('canLevelUp', () => {
  it(`is true once ${DAYS_TO_LEVEL_UP} distinct days are completed and a next level exists`, () => {
    const p = profile({ currentTarget: 100, weekStartDate: '2026-06-01' })
    const days = ['02', '03', '04', '05', '06', '07', '08']
    const exercises = days.map((d) => ex({ date: `2026-06-${d}` }))
    expect(canLevelUp(exercises, p)).toBe(true)
  })

  it('is false below the threshold', () => {
    const p = profile({ currentTarget: 100, weekStartDate: '2026-06-01' })
    const exercises = ['02', '03', '04'].map((d) => ex({ date: `2026-06-${d}` }))
    expect(canLevelUp(exercises, p)).toBe(false)
  })

  it('is false at the top of the ladder even with enough days', () => {
    const p = profile({ currentTarget: 2000, weekStartDate: '2026-06-01' })
    const days = ['02', '03', '04', '05', '06', '07', '08']
    const exercises = days.map((d) => ex({ date: `2026-06-${d}`, targetPulses: 2000, pulsesCompleted: 2000 }))
    expect(canLevelUp(exercises, p)).toBe(false)
  })
})

function log(over: Partial<ActivityLog>): ActivityLog {
  return {
    $id: 'l', userId: 'u', date: '2026-06-10', type: 'strength',
    completed: true, durationSec: 60, ...over,
  }
}

describe('consistentSessions', () => {
  it('counts distinct completed days for the given type since sinceISO', () => {
    const logs = [
      log({ date: '2026-06-10', type: 'strength' }),
      log({ date: '2026-06-11', type: 'strength' }),
      log({ date: '2026-06-11', type: 'strength' }), // duplicate day -> counts once
    ]
    expect(consistentSessions(logs, { type: 'strength', sinceISO: '2026-06-01' })).toBe(2)
  })

  it('ignores logs of other activity types', () => {
    const logs = [
      log({ date: '2026-06-10', type: 'run' }),
      log({ date: '2026-06-11', type: 'strength' }),
    ]
    expect(consistentSessions(logs, { type: 'strength', sinceISO: '2026-06-01' })).toBe(1)
  })

  it('ignores incomplete logs', () => {
    const logs = [
      log({ date: '2026-06-10', type: 'strength', completed: false }),
      log({ date: '2026-06-11', type: 'strength', completed: true }),
    ]
    expect(consistentSessions(logs, { type: 'strength', sinceISO: '2026-06-01' })).toBe(1)
  })

  it('ignores logs with dates before sinceISO', () => {
    const logs = [
      log({ date: '2026-05-30', type: 'strength' }),
      log({ date: '2026-06-10', type: 'strength' }),
    ]
    expect(consistentSessions(logs, { type: 'strength', sinceISO: '2026-06-01' })).toBe(1)
  })
})

describe('shouldRamp', () => {
  it('returns true when 7 distinct completed days are reached', () => {
    const days = ['01', '02', '03', '04', '05', '06', '07']
    const logs = days.map((d) => log({ date: `2026-06-${d}`, type: 'strength' }))
    expect(shouldRamp(logs, { type: 'strength', sinceISO: '2026-06-01' })).toBe(true)
  })

  it('returns false with only 6 distinct completed days', () => {
    const days = ['01', '02', '03', '04', '05', '06']
    const logs = days.map((d) => log({ date: `2026-06-${d}`, type: 'strength' }))
    expect(shouldRamp(logs, { type: 'strength', sinceISO: '2026-06-01' })).toBe(false)
  })
})
