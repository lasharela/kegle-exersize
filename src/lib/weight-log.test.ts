import { describe, it, expect } from 'vitest'
import { movingAverage } from './weight-log'

const e = (date: string, kg: number) => ({ date, kg })

describe('movingAverage', () => {
  it('returns empty for empty input', () => {
    expect(movingAverage([])).toEqual([])
  })

  it('averages over what exists when shorter than the window', () => {
    const r = movingAverage([e('2026-07-01', 100), e('2026-07-02', 99)])
    expect(r).toEqual([
      { date: '2026-07-01', kg: 100 },
      { date: '2026-07-02', kg: 99.5 },
    ])
  })

  it('uses a trailing window of the given size', () => {
    const entries = [1, 2, 3, 4, 5].map((n) => e(`2026-07-0${n}`, n))
    const r = movingAverage(entries, 3)
    expect(r.map((p) => p.kg)).toEqual([1, 1.5, 2, 3, 4])
  })
})
