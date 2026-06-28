import { describe, it, expect } from 'vitest'
import { WEEKLY_SCHEDULE, STRENGTH_CIRCUIT, WARMUP, RUNNING, PROGRESSION } from './program'

describe('program config', () => {
  it('runs Mon/Wed/Fri and strength+warmup Tue/Thu/Sat, kegel daily, Sun rest', () => {
    for (let d = 0; d <= 6; d++) expect(WEEKLY_SCHEDULE[d as 0]).toContain('kegel')
    expect(WEEKLY_SCHEDULE[1]).toContain('run')
    expect(WEEKLY_SCHEDULE[2]).toEqual(expect.arrayContaining(['warmup', 'strength']))
    expect(WEEKLY_SCHEDULE[3]).toContain('run')
    expect(WEEKLY_SCHEDULE[0]).toEqual(['kegel'])
  })
  it('has all 7 strength exercises in English with sets/reps/ramp', () => {
    const keys = STRENGTH_CIRCUIT.map((e) => e.key)
    expect(keys).toEqual(['swing','upright_row','goblet_squat','lunge','overhead_press','pushup','bent_row','glute_bridge','dead_bug','front_plank','side_plank'])
    expect(STRENGTH_CIRCUIT[0].sets).toBe(3)
    expect(STRENGTH_CIRCUIT[0].startReps).toBe(15)
    expect(STRENGTH_CIRCUIT.find((e) => e.key === 'pushup')!.startReps).toBe(5)
    STRENGTH_CIRCUIT.forEach((e) => { expect(e.rampStep).toBeGreaterThan(0); expect(e.name).toMatch(/^[\x00-\x7F]+$/) })
  })
  it('exposes warmup moves, running defaults and a 7-session ramp gate', () => {
    expect(WARMUP.length).toBeGreaterThanOrEqual(4)
    expect(RUNNING.startMinutes).toBe(20)
    expect(PROGRESSION.sessionsToRamp).toBe(7)
  })
})
