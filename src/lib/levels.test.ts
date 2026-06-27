import { describe, it, expect } from 'vitest'
import { LEVELS, levelIndex, nextTarget, prevTarget, levelNumber } from './levels'

describe('LEVELS ladder', () => {
  it('starts at 100 and ends at 2000', () => {
    expect(LEVELS[0]).toBe(100)
    expect(LEVELS[LEVELS.length - 1]).toBe(2000)
  })

  it('steps by 50 up to 500, then 100 up to 1000, then 200 up to 2000', () => {
    expect(LEVELS).toEqual([
      100, 150, 200, 250, 300, 350, 400, 450, 500,
      600, 700, 800, 900, 1000,
      1200, 1400, 1600, 1800, 2000,
    ])
  })
})

describe('levelIndex', () => {
  it('returns the index of an exact ladder value', () => {
    expect(levelIndex(100)).toBe(0)
    expect(levelIndex(500)).toBe(8)
    expect(levelIndex(2000)).toBe(18)
  })

  it('snaps an off-ladder target down to the nearest rung at or below it', () => {
    expect(levelIndex(120)).toBe(0)   // between 100 and 150 -> 100
    expect(levelIndex(550)).toBe(8)   // between 500 and 600 -> 500
  })

  it('clamps below the floor to level 0', () => {
    expect(levelIndex(10)).toBe(0)
  })

  it('clamps above the ceiling to the top rung', () => {
    expect(levelIndex(5000)).toBe(18)
  })
})

describe('nextTarget / prevTarget', () => {
  it('returns the next rung, or null at the top', () => {
    expect(nextTarget(100)).toBe(150)
    expect(nextTarget(500)).toBe(600)
    expect(nextTarget(1000)).toBe(1200)
    expect(nextTarget(2000)).toBeNull()
  })

  it('returns the previous rung, or null at the bottom', () => {
    expect(prevTarget(150)).toBe(100)
    expect(prevTarget(600)).toBe(500)
    expect(prevTarget(100)).toBeNull()
  })

  it('works from an off-ladder current target', () => {
    expect(nextTarget(400)).toBe(450) // 400 is on-ladder
    expect(nextTarget(120)).toBe(150) // snaps to 100, next is 150
  })
})

describe('levelNumber', () => {
  it('is 1-based', () => {
    expect(levelNumber(100)).toBe(1)
    expect(levelNumber(2000)).toBe(19)
  })
})
