import { useState, useCallback, useRef } from 'react'
import { createInitialState, startExercise, tick } from '../lib/exercise-engine'
import type { ExerciseState } from '../lib/types'
import { useTimer, useElapsed } from './useTimer'

export function useExercise(target: number, pulseInterval: number) {
  const [state, setState] = useState<ExerciseState>(() => createInitialState(target, pulseInterval))
  const stateRef = useRef(state)
  stateRef.current = state

  const isActive = state.phase !== 'idle' && state.phase !== 'completed' && !state.isPaused
  const { elapsed, reset: resetElapsed } = useElapsed(isActive)

  const handleTick = useCallback(() => {
    setState((prev) => {
      const next = tick(prev)
      return next
    })
  }, [])

  useTimer(handleTick, 1000, isActive)

  const start = useCallback(() => {
    const initial = createInitialState(target, pulseInterval)
    setState(startExercise(initial))
    resetElapsed()
  }, [target, pulseInterval, resetElapsed])

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
    setState(createInitialState(target, pulseInterval))
    resetElapsed()
  }, [target, pulseInterval, resetElapsed])

  return { state, elapsed, start, pause, resume, stop, reset }
}
