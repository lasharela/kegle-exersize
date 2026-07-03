import { describe, it, expect } from 'vitest'
import { isDayComplete, computeStreak } from './streak'
import type { ActivityLog } from './types'
import type { ActivityType } from './program'

// STREAK_EPOCH is 2026-07-02. Weekdays: 2026-07-02 = Thursday (strength day),
// 2026-07-03 = Friday (run day), 2026-07-04 = Saturday (strength day),
// 2026-07-05 = Sunday (kegel only), 2026-07-06 = Monday (run day).

let id = 0
function log(date: string, type: ActivityType, completed = true): ActivityLog {
  return { $id: String(++id), userId: 'u', date, type, completed, durationSec: 60 }
}

function fullDay(date: string, types: ActivityType[]): ActivityLog[] {
  return types.map((t) => log(date, t))
}

describe('isDayComplete', () => {
  it('pre-epoch days only require kegel', () => {
    expect(isDayComplete('2026-06-30', new Set(['2026-06-30']), [])).toBe(true)
    expect(isDayComplete('2026-06-30', new Set(), [])).toBe(false)
  })

  it('post-epoch days require every scheduled activity', () => {
    const kegel = new Set(['2026-07-02'])
    // Thursday: kegel + warmup + strength scheduled
    expect(isDayComplete('2026-07-02', kegel, [])).toBe(false)
    expect(isDayComplete('2026-07-02', kegel, fullDay('2026-07-02', ['warmup', 'strength']))).toBe(true)
  })

  it('incomplete logs do not count', () => {
    const kegel = new Set(['2026-07-03'])
    expect(isDayComplete('2026-07-03', kegel, [log('2026-07-03', 'run', false)])).toBe(false)
  })

  it('sunday needs only kegel', () => {
    expect(isDayComplete('2026-07-05', new Set(['2026-07-05']), [])).toBe(true)
  })
})

describe('computeStreak', () => {
  it('counts consecutive complete days ending today', () => {
    const kegel = new Set(['2026-07-02', '2026-07-03', '2026-07-04'])
    const logs = [
      ...fullDay('2026-07-02', ['warmup', 'strength']),
      ...fullDay('2026-07-03', ['run']),
      ...fullDay('2026-07-04', ['warmup', 'strength']),
    ]
    const r = computeStreak({ kegelDates: kegel, logs, shieldsUsed: [], shieldsOwned: 0, today: '2026-07-04' })
    expect(r).toEqual({ streak: 3, consume: [] })
  })

  it('an in-progress today anchors at yesterday instead of zeroing', () => {
    const kegel = new Set(['2026-07-02', '2026-07-03'])
    const logs = [
      ...fullDay('2026-07-02', ['warmup', 'strength']),
      ...fullDay('2026-07-03', ['run']),
    ]
    const r = computeStreak({ kegelDates: kegel, logs, shieldsUsed: [], shieldsOwned: 0, today: '2026-07-04' })
    expect(r.streak).toBe(2)
  })

  it('bridges pre-epoch history with kegel-only days', () => {
    const kegel = new Set(['2026-06-29', '2026-06-30', '2026-07-01', '2026-07-02'])
    const logs = fullDay('2026-07-02', ['warmup', 'strength'])
    const r = computeStreak({ kegelDates: kegel, logs, shieldsUsed: [], shieldsOwned: 0, today: '2026-07-02' })
    expect(r.streak).toBe(4)
  })

  it('already-shielded days extend the streak without consuming', () => {
    const kegel = new Set(['2026-07-02', '2026-07-04'])
    const logs = [
      ...fullDay('2026-07-02', ['warmup', 'strength']),
      ...fullDay('2026-07-04', ['warmup', 'strength']),
    ]
    const r = computeStreak({ kegelDates: kegel, logs, shieldsUsed: ['2026-07-03'], shieldsOwned: 0, today: '2026-07-04' })
    expect(r).toEqual({ streak: 3, consume: [] })
  })

  it('consumes a shield to bridge a 1-day gap backed by a complete day', () => {
    const kegel = new Set(['2026-07-02', '2026-07-04'])
    const logs = [
      ...fullDay('2026-07-02', ['warmup', 'strength']),
      ...fullDay('2026-07-04', ['warmup', 'strength']),
    ]
    const r = computeStreak({ kegelDates: kegel, logs, shieldsUsed: [], shieldsOwned: 1, today: '2026-07-04' })
    expect(r).toEqual({ streak: 3, consume: ['2026-07-03'] })
  })

  it('does not consume when the gap exceeds available shields', () => {
    const kegel = new Set(['2026-07-01', '2026-07-04'])
    const logs = fullDay('2026-07-04', ['warmup', 'strength'])
    // gap = Jul 2 + Jul 3, only 1 shield
    const r = computeStreak({ kegelDates: kegel, logs, shieldsUsed: [], shieldsOwned: 1, today: '2026-07-04' })
    expect(r).toEqual({ streak: 1, consume: [] })
  })

  it('does not waste shields on a dead streak (nothing complete beyond the gap)', () => {
    const kegel = new Set(['2026-07-04'])
    const logs = fullDay('2026-07-04', ['warmup', 'strength'])
    const r = computeStreak({ kegelDates: kegel, logs, shieldsUsed: [], shieldsOwned: 3, today: '2026-07-04' })
    expect(r).toEqual({ streak: 1, consume: [] })
  })

  it('returns 0 when neither today nor yesterday is complete and no bridgeable history', () => {
    const r = computeStreak({ kegelDates: new Set(), logs: [], shieldsUsed: [], shieldsOwned: 3, today: '2026-07-04' })
    expect(r).toEqual({ streak: 0, consume: [] })
  })
})
