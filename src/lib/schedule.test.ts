import { describe, it, expect } from 'vitest'
import { activitiesForDate, weeklyProgress, weekStartISO } from './schedule'

describe('activitiesForDate', () => {
  it('returns the weekday activities (2026-06-30 is a Tuesday)', () => {
    expect(activitiesForDate('2026-06-30')).toEqual(['kegel', 'warmup', 'strength'])
  })
  it('Sunday is rest + kegel only (2026-06-28)', () => {
    expect(activitiesForDate('2026-06-28')).toEqual(['kegel'])
  })
})
describe('weekStartISO', () => {
  it('returns Monday for a mid-week date (2026-07-01 Wed -> 2026-06-29 Mon)', () => {
    expect(weekStartISO('2026-07-01')).toBe('2026-06-29')
  })
})
describe('weeklyProgress', () => {
  it('counts distinct completed activity-days scheduled this week', () => {
    const r = weeklyProgress({
      logs: [{ date: '2026-06-30', type: 'strength', completed: true } as any],
      kegelDates: ['2026-06-29', '2026-06-30'],
      weekStart: '2026-06-29', today: '2026-06-30',
    })
    expect(r.done).toBeGreaterThan(0)
    expect(r.total).toBeGreaterThan(0)
    expect(r.done).toBeLessThanOrEqual(r.total)
  })
})
