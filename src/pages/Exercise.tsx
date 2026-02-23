import { useState, useEffect, useRef } from 'react'
import { ID } from 'appwrite'
import { useAuth } from '../context/AuthContext'
import { useExercise } from '../hooks/useExercise'
import { useSound } from '../hooks/useSound'
import { isBreakPhase } from '../lib/exercise-engine'
import { databases, DATABASE_ID, EXERCISES_COLLECTION } from '../lib/appwrite'
import PulseCircle from '../components/PulseCircle'
import RestBreak from '../components/RestBreak'
import CompletionOverlay from '../components/CompletionOverlay'

export default function Exercise() {
  const { profile, updateProfile, refreshProfile } = useAuth()
  const target = profile?.currentTarget ?? 400
  const interval = profile?.pulseInterval ?? 1.5

  const { state, elapsed, start, pause, resume, stop, reset } = useExercise(target, interval)
  const { pulseClick, releaseClick, breakChime, completionFanfare, initAudio } = useSound()
  const [showCompletion, setShowCompletion] = useState(false)
  const [pointsEarned, setPointsEarned] = useState(0)
  const prevPhase = useRef(state.phase)
  const startTimeRef = useRef<string>('')

  useEffect(() => {
    const prev = prevPhase.current
    const curr = state.phase
    prevPhase.current = curr

    if (prev === curr) return

    if (curr === 'pulse_squeeze') pulseClick()
    if (curr === 'pulse_release') releaseClick()
    if (isBreakPhase(curr)) breakChime()
    if (curr === 'completed') {
      completionFanfare()
      saveExercise()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase])

  const saveExercise = async () => {
    if (!profile) return
    const points = Math.floor(state.pulsesCompleted / 100)
    setPointsEarned(points)

    try {
      await databases.createDocument(DATABASE_ID, EXERCISES_COLLECTION, ID.unique(), {
        userId: profile.userId,
        date: new Date().toISOString().split('T')[0],
        completed: state.pulsesCompleted >= state.targetPulses,
        pulsesCompleted: state.pulsesCompleted,
        targetPulses: state.targetPulses,
        pointsEarned: points,
        startTime: startTimeRef.current,
        endTime: new Date().toISOString(),
        shieldUsed: false,
      })

      await updateProfile({
        totalPoints: profile.totalPoints + points,
        totalPulses: profile.totalPulses + state.pulsesCompleted,
      })
    } catch (e) {
      console.error('Failed to save exercise:', e)
    }

    setShowCompletion(true)
  }

  const handleStart = () => {
    initAudio()
    startTimeRef.current = new Date().toISOString()
    start()
  }

  const handleCloseCompletion = async () => {
    setShowCompletion(false)
    reset()
    await refreshProfile()
  }

  const { phase, isPaused } = state

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
      <PulseCircle state={state} />

      {isBreakPhase(phase) && <RestBreak state={state} />}

      <div className="flex gap-4 mt-8">
        {phase === 'idle' && (
          <button
            onClick={handleStart}
            className="bg-primary text-white font-bold rounded-full px-10 py-4 text-lg active:scale-95 transition-transform"
          >
            Start
          </button>
        )}

        {phase !== 'idle' && phase !== 'completed' && (
          <>
            <button
              onClick={isPaused ? resume : pause}
              className="bg-surface border border-border text-text font-semibold rounded-full px-8 py-3 active:scale-95 transition-transform"
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={stop}
              className="bg-surface border border-primary text-primary font-semibold rounded-full px-8 py-3 active:scale-95 transition-transform"
            >
              Stop
            </button>
          </>
        )}

        {phase === 'completed' && !showCompletion && (
          <button
            onClick={() => setShowCompletion(true)}
            className="bg-primary text-white font-bold rounded-full px-10 py-4 text-lg active:scale-95 transition-transform"
          >
            View Results
          </button>
        )}
      </div>

      {phase !== 'idle' && (
        <p className="text-text-dim text-xs mt-4">
          {Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')} elapsed
        </p>
      )}

      {showCompletion && (
        <CompletionOverlay
          pulsesCompleted={state.pulsesCompleted}
          targetPulses={state.targetPulses}
          elapsed={elapsed}
          pointsEarned={pointsEarned}
          onClose={handleCloseCompletion}
        />
      )}
    </div>
  )
}
