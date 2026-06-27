import { describe, it, expect } from 'vitest'
import { createInitialState, skipPhase, LIGHT_LEVEL_MAX } from './exercise-engine'
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
