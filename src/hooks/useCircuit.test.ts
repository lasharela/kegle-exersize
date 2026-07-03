import { describe, it, expect } from 'vitest'
import { buildSteps, type Step } from './useCircuit'
import { STRENGTH_CIRCUIT } from '../lib/program'

describe('buildSteps', () => {
  it('expands sets into exercise steps with rests between every step', () => {
    const reps = Object.fromEntries(STRENGTH_CIRCUIT.map((e) => [e.key, e.startReps]))
    const steps = buildSteps(STRENGTH_CIRCUIT, reps)
    const ex = steps.filter((s) => s.kind === 'exercise')
    const rest = steps.filter((s) => s.kind === 'rest')
    const totalSets = STRENGTH_CIRCUIT.reduce((n, e) => n + e.sets, 0) // 9
    expect(ex.length).toBe(totalSets)
    expect(rest.length).toBe(totalSets - 1) // rest between every pair
    expect(steps[steps.length - 1].kind).toBe('exercise') // ends on work, not rest
  })
  it('uses reps from the map, falling back to startReps', () => {
    const steps = buildSteps(STRENGTH_CIRCUIT, { swing: 30 })
    const firstSwing = steps.find((s) => s.kind === 'exercise' && s.exercise.key === 'swing') as Extract<Step, { kind: 'exercise' }>
    expect(firstSwing.reps).toBe(30)
    const pushup = steps.find((s) => s.kind === 'exercise' && s.exercise.key === 'pushup') as Extract<Step, { kind: 'exercise' }>
    expect(pushup.reps).toBe(5) // falls back to startReps
  })
})
