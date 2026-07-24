import { describe, it, expect } from 'vitest'
import { createInitialState, skipPhase, tick, LIGHT_LEVEL_MAX } from './exercise-engine'
import type { ExerciseState } from './types'

function atBreakA(target: number): ExerciseState {
  return { ...createInitialState(target, 1500), phase: 'breakA', timeRemaining: 30 }
}

describe('light-level warmup skipping', () => {
  it('routes breakA straight to fast pulses when target is light (<= LIGHT_LEVEL_MAX)', () => {
    const next = skipPhase(atBreakA(LIGHT_LEVEL_MAX))
    expect(next.phase).toBe('pulse_tick')
  })

  it('still runs the long warmup when target is above the light threshold', () => {
    const next = skipPhase(atBreakA(LIGHT_LEVEL_MAX + 50))
    expect(next.phase).toBe('warmupB_hold')
  })
})

describe('elapsed-time ticking', () => {
  it('uses the actual elapsed delta instead of assuming a perfect 100ms timer', () => {
    const state: ExerciseState = { ...createInitialState(100, 1500), phase: 'warmupA_hold', timeRemaining: 2, warmupARep: 1 }
    expect(tick(state, 0.37).timeRemaining).toBeCloseTo(1.63)
  })

  it('carries delayed foreground ticks into the next phase without accumulating drift', () => {
    const state: ExerciseState = { ...createInitialState(100, 1500), phase: 'warmupA_hold', timeRemaining: 0.2, warmupARep: 1 }
    const next = tick(state, 0.35)
    expect(next.phase).toBe('warmupA_rest')
    expect(next.timeRemaining).toBeCloseTo(1.85)
  })

  it('keeps fast-pulse rhythm aligned after a delayed PWA timer callback', () => {
    const state: ExerciseState = { ...createInitialState(100, 1500), phase: 'pulse_tick', timeRemaining: 0.1, pulsesCompleted: 10 }
    const next = tick(state, 0.35)
    expect(next.phase).toBe('pulse_tick')
    expect(next.pulsesCompleted).toBe(11)
    expect(next.timeRemaining).toBeCloseTo(1.25)
  })
})
