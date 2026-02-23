import type { ExerciseState } from '../lib/types'

interface Props {
  state: ExerciseState
}

export default function RestBreak({ state }: Props) {
  const { phase, warmupARep, warmupBRep, totalWarmupAReps, totalWarmupBReps, pulsesCompleted, targetPulses } = state

  let subtitle = ''

  if (phase === 'breakA') {
    subtitle = `Warm-up A complete (${warmupARep}/${totalWarmupAReps} reps)`
  } else if (phase === 'breakB') {
    subtitle = `Warm-up B complete (${warmupBRep}/${totalWarmupBReps} reps)`
  } else if (phase === 'pulse_break') {
    subtitle = `${pulsesCompleted} / ${targetPulses} pulses done`
  }

  return (
    <div className="text-center mt-4">
      <p className="text-text-dim text-sm">{subtitle}</p>
    </div>
  )
}
