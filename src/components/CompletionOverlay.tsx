import { useEffect } from 'react'
import confetti from 'canvas-confetti'

interface Props {
  pulsesCompleted: number
  targetPulses: number
  elapsed: number
  pointsEarned: number
  onClose: () => void
}

export default function CompletionOverlay({ pulsesCompleted, targetPulses, elapsed, pointsEarned, onClose }: Props) {
  useEffect(() => {
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#ef4444', '#22c55e', '#eab308', '#3b82f6'],
    })
  }, [])

  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60
  const completed = pulsesCompleted >= targetPulses

  return (
    <div className="fixed inset-0 bg-bg/95 z-50 flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">{completed ? '🎉' : '💪'}</div>
        <h2 className="text-2xl font-bold mb-2">
          {completed ? 'Exercise Complete!' : 'Good Effort!'}
        </h2>

        <div className="grid grid-cols-2 gap-4 mt-6 mb-8">
          <div className="bg-surface rounded-xl p-4">
            <p className="text-2xl font-bold text-primary">{pulsesCompleted}</p>
            <p className="text-text-dim text-xs">Pulses</p>
          </div>
          <div className="bg-surface rounded-xl p-4">
            <p className="text-2xl font-bold text-green">+{pointsEarned}</p>
            <p className="text-text-dim text-xs">Points</p>
          </div>
          <div className="bg-surface rounded-xl p-4">
            <p className="text-2xl font-bold text-blue">{minutes}:{seconds.toString().padStart(2, '0')}</p>
            <p className="text-text-dim text-xs">Duration</p>
          </div>
          <div className="bg-surface rounded-xl p-4">
            <p className="text-2xl font-bold text-yellow">{targetPulses}</p>
            <p className="text-text-dim text-xs">Target</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="bg-primary text-white font-semibold rounded-lg py-3 px-8 w-full active:scale-[0.98] transition-transform"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
