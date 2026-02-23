import { useState, useEffect, useRef } from 'react'
import { ID, Permission, Role } from 'appwrite'
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
  const intervalMs = (profile?.pulseInterval ?? 1.5) * 1000

  const { state, elapsed, start, pause, resume, stop, reset, skip } = useExercise(target, intervalMs)
  const { squeezeChime, releaseChime, fastBeep, breakSound, completionFanfare, initAudio } = useSound()
  const [showCompletion, setShowCompletion] = useState(false)
  const [pointsEarned, setPointsEarned] = useState(0)
  const prevPhase = useRef(state.phase)
  const prevPulses = useRef(state.pulsesCompleted)
  const startTimeRef = useRef<string>('')

  // Sound triggers on phase changes (warmups, breaks, completion)
  useEffect(() => {
    const prev = prevPhase.current
    const curr = state.phase
    prevPhase.current = curr

    if (prev === curr) return

    // Warmup: ascending chime on squeeze/hold, descending on release
    if (curr === 'warmupA_hold' || curr === 'warmupB_hold') squeezeChime()
    if (curr === 'warmupA_rest' || curr === 'warmupB_rest') releaseChime()

    // Breaks: distinct melody
    if (isBreakPhase(curr)) breakSound()

    // First pulse beep when entering pulse phase
    if (curr === 'pulse_tick' && prev !== 'pulse_tick') fastBeep()

    if (curr === 'completed') {
      completionFanfare()
      saveExercise()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase])

  // Beep on every pulse tick (pulsesCompleted changes while phase stays pulse_tick)
  useEffect(() => {
    const prev = prevPulses.current
    prevPulses.current = state.pulsesCompleted

    if (state.phase === 'pulse_tick' && state.pulsesCompleted > prev) {
      fastBeep()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.pulsesCompleted])

  const saveExercise = async () => {
    if (!profile) return
    const points = Math.floor(state.pulsesCompleted / 100)
    setPointsEarned(points)

    try {
      await databases.createDocument(
        DATABASE_ID,
        EXERCISES_COLLECTION,
        ID.unique(),
        {
          userId: profile.userId,
          date: new Date().toISOString().split('T')[0],
          completed: state.pulsesCompleted >= state.targetPulses,
          pulsesCompleted: state.pulsesCompleted,
          targetPulses: state.targetPulses,
          pointsEarned: points,
          startTime: startTimeRef.current,
          endTime: new Date().toISOString(),
          shieldUsed: false,
        },
        [
          Permission.read(Role.user(profile.userId)),
          Permission.update(Role.user(profile.userId)),
        ]
      )

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
  const isRunning = phase !== 'idle' && phase !== 'completed' && phase !== 'countdown'

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

        {isRunning && (
          <>
            <button
              onClick={isPaused ? resume : pause}
              className="bg-surface border border-border text-text font-semibold rounded-full px-8 py-3 active:scale-95 transition-transform"
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={skip}
              className="bg-surface border border-yellow/40 text-yellow font-semibold rounded-full px-6 py-3 active:scale-95 transition-transform"
            >
              {phase === 'pulse_tick' || phase === 'pulse_break' ? 'Finish' : 'Skip'}
            </button>
            <button
              onClick={stop}
              className="bg-surface border border-primary text-primary font-semibold rounded-full px-6 py-3 active:scale-95 transition-transform"
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
