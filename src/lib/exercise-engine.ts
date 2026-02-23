import type { ExerciseState, ExercisePhase } from './types'

// Phase 1: Short Warmup — 2s squeeze + 2s rest × 20, then 30s break
const WARMUP_A_HOLD = 2
const WARMUP_A_REST = 2
const WARMUP_A_REPS = 20

// Phase 2: Long Warmup — 10s hold + 10s rest × 5, then 30s break
const WARMUP_B_HOLD = 10
const WARMUP_B_REST = 10
const WARMUP_B_REPS = 5

const BREAK_DURATION = 30
const PULSES_PER_REST = 200
const COUNTDOWN_SECONDS = 3

// Tick interval in seconds (100ms ticks)
export const TICK_MS = 100
export const TICK_S = TICK_MS / 1000

export function createInitialState(target: number, pulseIntervalMs: number): ExerciseState {
  return {
    phase: 'idle',
    timeRemaining: 0,
    warmupARep: 0,
    warmupBRep: 0,
    pulsesCompleted: 0,
    targetPulses: target,
    pulseInterval: pulseIntervalMs / 1000,
    totalWarmupAReps: WARMUP_A_REPS,
    totalWarmupBReps: WARMUP_B_REPS,
    isPaused: false,
  }
}

export function startExercise(state: ExerciseState): ExerciseState {
  return { ...state, phase: 'countdown', timeRemaining: COUNTDOWN_SECONDS }
}

export function tick(state: ExerciseState): ExerciseState {
  if (state.isPaused || state.phase === 'idle' || state.phase === 'completed') return state

  const next = state.timeRemaining - TICK_S

  if (next > TICK_S / 2) {
    return { ...state, timeRemaining: next }
  }

  return advancePhase(state)
}

export function skipPhase(state: ExerciseState): ExerciseState {
  if (state.phase === 'idle' || state.phase === 'completed') return state

  const { phase } = state

  if (phase === 'countdown') {
    return { ...state, phase: 'warmupA_hold', timeRemaining: WARMUP_A_HOLD, warmupARep: 1 }
  }
  if (phase === 'warmupA_hold' || phase === 'warmupA_rest') {
    return { ...state, phase: 'breakA', timeRemaining: BREAK_DURATION, warmupARep: WARMUP_A_REPS }
  }
  if (phase === 'breakA') {
    return { ...state, phase: 'warmupB_hold', timeRemaining: WARMUP_B_HOLD, warmupBRep: 1 }
  }
  if (phase === 'warmupB_hold' || phase === 'warmupB_rest') {
    return { ...state, phase: 'breakB', timeRemaining: BREAK_DURATION, warmupBRep: WARMUP_B_REPS }
  }
  if (phase === 'breakB') {
    return { ...state, phase: 'pulse_tick', timeRemaining: state.pulseInterval }
  }
  if (phase === 'pulse_tick') {
    return { ...state, phase: 'completed', timeRemaining: 0 }
  }
  if (phase === 'pulse_break') {
    return { ...state, phase: 'pulse_tick', timeRemaining: state.pulseInterval }
  }

  return state
}

function advancePhase(state: ExerciseState): ExerciseState {
  const { phase } = state

  if (phase === 'countdown') {
    return { ...state, phase: 'warmupA_hold', timeRemaining: WARMUP_A_HOLD, warmupARep: 1 }
  }

  if (phase === 'warmupA_hold') {
    return { ...state, phase: 'warmupA_rest', timeRemaining: WARMUP_A_REST }
  }

  if (phase === 'warmupA_rest') {
    if (state.warmupARep < WARMUP_A_REPS) {
      return { ...state, phase: 'warmupA_hold', timeRemaining: WARMUP_A_HOLD, warmupARep: state.warmupARep + 1 }
    }
    return { ...state, phase: 'breakA', timeRemaining: BREAK_DURATION }
  }

  if (phase === 'breakA') {
    return { ...state, phase: 'warmupB_hold', timeRemaining: WARMUP_B_HOLD, warmupBRep: 1 }
  }

  if (phase === 'warmupB_hold') {
    return { ...state, phase: 'warmupB_rest', timeRemaining: WARMUP_B_REST }
  }

  if (phase === 'warmupB_rest') {
    if (state.warmupBRep < WARMUP_B_REPS) {
      return { ...state, phase: 'warmupB_hold', timeRemaining: WARMUP_B_HOLD, warmupBRep: state.warmupBRep + 1 }
    }
    return { ...state, phase: 'breakB', timeRemaining: BREAK_DURATION }
  }

  if (phase === 'breakB') {
    return { ...state, phase: 'pulse_tick', timeRemaining: state.pulseInterval }
  }

  if (phase === 'pulse_tick') {
    const newPulses = state.pulsesCompleted + 1
    if (newPulses >= state.targetPulses) {
      return { ...state, phase: 'completed', pulsesCompleted: newPulses, timeRemaining: 0 }
    }
    if (newPulses % PULSES_PER_REST === 0) {
      return { ...state, phase: 'pulse_break', pulsesCompleted: newPulses, timeRemaining: BREAK_DURATION }
    }
    return { ...state, phase: 'pulse_tick', pulsesCompleted: newPulses, timeRemaining: state.pulseInterval }
  }

  if (phase === 'pulse_break') {
    return { ...state, phase: 'pulse_tick', timeRemaining: state.pulseInterval }
  }

  return state
}

export function getPhaseNumber(phase: ExercisePhase): { num: number; total: number; name: string } {
  if (phase === 'countdown') {
    return { num: 0, total: 3, name: 'Get Ready' }
  }
  if (phase === 'warmupA_hold' || phase === 'warmupA_rest' || phase === 'breakA') {
    return { num: 1, total: 3, name: 'Short Warmup' }
  }
  if (phase === 'warmupB_hold' || phase === 'warmupB_rest' || phase === 'breakB') {
    return { num: 2, total: 3, name: 'Long Warmup' }
  }
  if (phase === 'pulse_tick' || phase === 'pulse_break') {
    return { num: 3, total: 3, name: 'Fast Pulses' }
  }
  return { num: 0, total: 3, name: '' }
}

export function getPhaseColor(phase: ExercisePhase): string {
  switch (phase) {
    case 'countdown':
      return '#eab308'
    case 'warmupA_hold':
    case 'warmupB_hold':
    case 'pulse_tick':
      return '#ef4444'
    case 'warmupA_rest':
    case 'warmupB_rest':
      return '#22c55e'
    case 'breakA':
    case 'breakB':
    case 'pulse_break':
      return '#3b82f6'
    case 'completed':
      return '#eab308'
    default:
      return '#888888'
  }
}

export function isBreakPhase(phase: ExercisePhase): boolean {
  return phase === 'breakA' || phase === 'breakB' || phase === 'pulse_break'
}

export function getCircleDisplay(state: ExerciseState): { big: string; sub: string } {
  const { phase } = state

  if (phase === 'idle') return { big: '', sub: 'Tap Start' }
  if (phase === 'completed') return { big: '', sub: 'Done!' }

  if (phase === 'countdown') {
    return { big: `${Math.ceil(state.timeRemaining)}`, sub: 'Get Ready' }
  }

  if (isBreakPhase(phase)) {
    return { big: `${Math.ceil(state.timeRemaining)}`, sub: 'Break' }
  }

  if (phase === 'warmupA_hold' || phase === 'warmupA_rest') {
    const label = phase === 'warmupA_hold' ? 'Squeeze' : 'Release'
    return { big: `${state.warmupARep}`, sub: label }
  }

  if (phase === 'warmupB_hold' || phase === 'warmupB_rest') {
    const label = phase === 'warmupB_hold' ? 'Hold' : 'Release'
    return { big: `${state.warmupBRep}`, sub: label }
  }

  if (phase === 'pulse_tick') {
    return { big: `${state.pulsesCompleted}`, sub: 'Pulse' }
  }

  return { big: '', sub: '' }
}

export function getPhaseProgress(state: ExerciseState): number {
  const { phase } = state

  if (phase === 'idle') return 0
  if (phase === 'completed') return 100

  if (phase === 'countdown') {
    return ((COUNTDOWN_SECONDS - state.timeRemaining) / COUNTDOWN_SECONDS) * 100
  }

  if (phase === 'warmupA_hold') {
    const repProgress = (WARMUP_A_HOLD - state.timeRemaining) / WARMUP_A_HOLD
    return ((state.warmupARep - 1 + repProgress) / WARMUP_A_REPS) * 100
  }
  if (phase === 'warmupA_rest') {
    const repProgress = (WARMUP_A_REST - state.timeRemaining) / WARMUP_A_REST
    return ((state.warmupARep - 1 + 0.5 + repProgress * 0.5) / WARMUP_A_REPS) * 100
  }

  if (phase === 'breakA' || phase === 'breakB' || phase === 'pulse_break') {
    return ((BREAK_DURATION - state.timeRemaining) / BREAK_DURATION) * 100
  }

  if (phase === 'warmupB_hold') {
    const repProgress = (WARMUP_B_HOLD - state.timeRemaining) / WARMUP_B_HOLD
    return ((state.warmupBRep - 1 + repProgress) / WARMUP_B_REPS) * 100
  }
  if (phase === 'warmupB_rest') {
    const repProgress = (WARMUP_B_REST - state.timeRemaining) / WARMUP_B_REST
    return ((state.warmupBRep - 1 + 0.5 + repProgress * 0.5) / WARMUP_B_REPS) * 100
  }

  if (phase === 'pulse_tick') {
    return (state.pulsesCompleted / state.targetPulses) * 100
  }

  return 0
}
