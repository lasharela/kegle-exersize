import type { ExerciseState, ExercisePhase } from './types'

const DEV_MODE = import.meta.env.DEV

const WARMUP_A_HOLD = DEV_MODE ? 1 : 3
const WARMUP_A_REST = DEV_MODE ? 1 : 3
const WARMUP_A_REPS = DEV_MODE ? 3 : 20
const WARMUP_B_HOLD = DEV_MODE ? 2 : 10
const WARMUP_B_REST = DEV_MODE ? 1 : 10
const WARMUP_B_REPS = DEV_MODE ? 2 : 5
const BREAK_DURATION = DEV_MODE ? 3 : 30
const PULSES_PER_REST = DEV_MODE ? 5 : 200

export function createInitialState(target: number, pulseInterval: number): ExerciseState {
  return {
    phase: 'idle',
    timeRemaining: 0,
    warmupARep: 0,
    warmupBRep: 0,
    pulsesCompleted: 0,
    targetPulses: target,
    pulseInterval,
    totalWarmupAReps: WARMUP_A_REPS,
    totalWarmupBReps: WARMUP_B_REPS,
    isPaused: false,
  }
}

export function startExercise(state: ExerciseState): ExerciseState {
  return { ...state, phase: 'warmupA_hold', timeRemaining: WARMUP_A_HOLD, warmupARep: 1 }
}

export function tick(state: ExerciseState): ExerciseState {
  if (state.isPaused || state.phase === 'idle' || state.phase === 'completed') return state

  const next = state.timeRemaining - 1

  if (next > 0) {
    return { ...state, timeRemaining: next }
  }

  return advancePhase(state)
}

function advancePhase(state: ExerciseState): ExerciseState {
  const { phase } = state

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
    return { ...state, phase: 'pulse_squeeze', timeRemaining: state.pulseInterval }
  }

  if (phase === 'pulse_squeeze') {
    return { ...state, phase: 'pulse_release', timeRemaining: state.pulseInterval }
  }

  if (phase === 'pulse_release') {
    const newPulses = state.pulsesCompleted + 1
    if (newPulses >= state.targetPulses) {
      return { ...state, phase: 'completed', pulsesCompleted: newPulses, timeRemaining: 0 }
    }
    if (newPulses % PULSES_PER_REST === 0) {
      return { ...state, phase: 'pulse_break', pulsesCompleted: newPulses, timeRemaining: BREAK_DURATION }
    }
    return { ...state, phase: 'pulse_squeeze', pulsesCompleted: newPulses, timeRemaining: state.pulseInterval }
  }

  if (phase === 'pulse_break') {
    return { ...state, phase: 'pulse_squeeze', timeRemaining: state.pulseInterval }
  }

  return state
}

export function getPhaseLabel(phase: ExercisePhase): string {
  switch (phase) {
    case 'idle': return 'Ready'
    case 'warmupA_hold': return 'Squeeze'
    case 'warmupA_rest': return 'Rest'
    case 'breakA': return 'Break'
    case 'warmupB_hold': return 'Hold'
    case 'warmupB_rest': return 'Rest'
    case 'breakB': return 'Break'
    case 'pulse_squeeze': return 'Squeeze'
    case 'pulse_release': return 'Release'
    case 'pulse_break': return 'Break'
    case 'completed': return 'Done!'
  }
}

export function getPhaseColor(phase: ExercisePhase): string {
  switch (phase) {
    case 'warmupA_hold':
    case 'warmupB_hold':
    case 'pulse_squeeze':
      return '#ef4444'
    case 'warmupA_rest':
    case 'warmupB_rest':
    case 'pulse_release':
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

export function isPulsePhase(phase: ExercisePhase): boolean {
  return phase === 'pulse_squeeze' || phase === 'pulse_release'
}

export function getCircleDisplay(state: ExerciseState): { big: string; sub: string } {
  const { phase } = state

  if (phase === 'idle') return { big: '', sub: 'Tap Start' }
  if (phase === 'completed') return { big: '✓', sub: 'Done!' }

  // Breaks always show countdown
  if (isBreakPhase(phase)) {
    return { big: `${Math.ceil(state.timeRemaining)}`, sub: 'Break' }
  }

  // Warmup A — show rep count
  if (phase === 'warmupA_hold' || phase === 'warmupA_rest') {
    const label = phase === 'warmupA_hold' ? 'Squeeze' : 'Rest'
    return { big: `${state.warmupARep}`, sub: `Set A · ${label}` }
  }

  // Warmup B — show rep count
  if (phase === 'warmupB_hold' || phase === 'warmupB_rest') {
    const label = phase === 'warmupB_hold' ? 'Hold' : 'Rest'
    return { big: `${state.warmupBRep}`, sub: `Set B · ${label}` }
  }

  // Main pulses — show pulse count
  if (phase === 'pulse_squeeze' || phase === 'pulse_release') {
    const label = phase === 'pulse_squeeze' ? 'Squeeze' : 'Release'
    return { big: `${state.pulsesCompleted}`, sub: label }
  }

  return { big: '', sub: '' }
}

export function getProgressPercent(state: ExerciseState): number {
  const { phase } = state

  if (phase === 'idle') return 0
  if (phase === 'completed') return 100

  const warmupAWeight = 15
  const warmupBWeight = 15
  const pulseWeight = 70

  let progress = 0

  if (phase.startsWith('warmupA') || phase === 'breakA') {
    progress = (state.warmupARep / WARMUP_A_REPS) * warmupAWeight
  } else if (phase.startsWith('warmupB') || phase === 'breakB') {
    progress = warmupAWeight + (state.warmupBRep / WARMUP_B_REPS) * warmupBWeight
  } else {
    progress = warmupAWeight + warmupBWeight + (state.pulsesCompleted / state.targetPulses) * pulseWeight
  }

  return Math.min(progress, 100)
}
