import { describe, it, expect } from 'vitest'
import { localDateISO } from './date'
describe('localDateISO', () => {
  it('formats a fixed local date as YYYY-MM-DD', () => {
    // Construct a local date explicitly (year, monthIndex, day)
    expect(localDateISO(new Date(2026, 5, 30))).toBe('2026-06-30') // June = month index 5
    expect(localDateISO(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})
