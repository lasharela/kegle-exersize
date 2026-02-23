import { getPhaseColor, getCircleDisplay, getProgressPercent } from '../lib/exercise-engine'
import type { ExerciseState } from '../lib/types'

interface Props {
  state: ExerciseState
}

export default function PulseCircle({ state }: Props) {
  const { phase } = state
  const color = getPhaseColor(phase)
  const { big, sub } = getCircleDisplay(state)
  const progress = getProgressPercent(state)

  const isSqueeze = phase === 'warmupA_hold' || phase === 'warmupB_hold' || phase === 'pulse_squeeze'
  const scale = isSqueeze ? 1.15 : 1

  const radius = 100
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="relative flex items-center justify-center">
      <svg width="260" height="260" className="absolute">
        <circle
          cx="130" cy="130" r={radius}
          fill="none"
          stroke="#333"
          strokeWidth="6"
        />
        <circle
          cx="130" cy="130" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 130 130)"
          className="transition-all duration-1000"
        />
      </svg>

      <div
        className="w-48 h-48 rounded-full flex flex-col items-center justify-center transition-transform duration-300"
        style={{ transform: `scale(${scale})`, backgroundColor: `${color}20` }}
      >
        <span className="text-4xl font-bold" style={{ color }}>
          {big}
        </span>
        <span className="text-sm font-semibold mt-1" style={{ color }}>
          {sub}
        </span>
        {(phase === 'pulse_squeeze' || phase === 'pulse_release' || phase === 'pulse_break') && (
          <span className="text-text-dim text-xs mt-1">
            / {state.targetPulses}
          </span>
        )}
      </div>
    </div>
  )
}
