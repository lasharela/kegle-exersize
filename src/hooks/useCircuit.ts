import { useState, useCallback } from 'react'
import type { StrengthExercise } from '../lib/program'

export type Step =
  | { kind: 'exercise'; exercise: StrengthExercise; setIndex: number; totalSets: number; reps: number }
  | { kind: 'rest'; restSec: number }

/**
 * Expand the circuit into a flat list of alternating exercise and rest steps.
 * Rests are inserted between every consecutive pair of exercise steps
 * (none after the last). restSec comes from the exercise the rest follows.
 */
export function buildSteps(
  circuit: StrengthExercise[],
  repsByKey: Record<string, number>,
): Step[] {
  const exerciseSteps: Array<{
    kind: 'exercise'
    exercise: StrengthExercise
    setIndex: number
    totalSets: number
    reps: number
  }> = []

  for (const exercise of circuit) {
    for (let s = 1; s <= exercise.sets; s++) {
      exerciseSteps.push({
        kind: 'exercise',
        exercise,
        setIndex: s,
        totalSets: exercise.sets,
        reps: repsByKey[exercise.key] ?? exercise.startReps,
      })
    }
  }

  const steps: Step[] = []
  for (let i = 0; i < exerciseSteps.length; i++) {
    steps.push(exerciseSteps[i])
    if (i < exerciseSteps.length - 1) {
      steps.push({ kind: 'rest', restSec: exerciseSteps[i].exercise.restSec })
    }
  }

  return steps
}

/** Minimal hook for navigating through a pre-built step list. */
export function useCircuit(steps: Step[]) {
  const [index, setIndex] = useState(0)
  const step = steps[index]
  const done = index >= steps.length
  const next = useCallback(() => setIndex((i) => i + 1), [])
  return { index, step, done, next }
}
