import { useState, useCallback } from 'react'
import { createInitialState, startExercise, tick, skipPhase, TICK_MS } from '../lib/exercise-engine'
import type { ExerciseState } from '../lib/types'
import { useTimer, useElapsed } from './useTimer'

export function useExercise(target: number, pulseIntervalMs: number) {
  const [state, setState] = useState<ExerciseState>(() => createInitialState(target, pulseIntervalMs))

  const isActive = state.phase !== 'idle' && state.phase !== 'completed' && !state.isPaused
  const { elapsed, reset: resetElapsed } = useElapsed(isActive)

  const handleTick = useCallback(() => {
    setState((prev) => tick(prev))
  }, [])

  useTimer(handleTick, TICK_MS, isActive)

  const start = useCallback(() => {
    const initial = createInitialState(target, pulseIntervalMs)
    setState(startExercise(initial))
    resetElapsed()
  }, [target, pulseIntervalMs, resetElapsed])

  const pause = useCallback(() => {
    setState((prev) => ({ ...prev, isPaused: true }))
  }, [])

  const resume = useCallback(() => {
    setState((prev) => ({ ...prev, isPaused: false }))
  }, [])

  const stop = useCallback(() => {
    setState((prev) => ({ ...prev, phase: 'completed', timeRemaining: 0 }))
  }, [])

  const reset = useCallback(() => {
    setState(createInitialState(target, pulseIntervalMs))
    resetElapsed()
  }, [target, pulseIntervalMs, resetElapsed])

  const skip = useCallback(() => {
    setState((prev) => skipPhase(prev))
  }, [])

  return { state, elapsed, start, pause, resume, stop, reset, skip }
}
