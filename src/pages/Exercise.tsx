import { useState, useEffect, useRef } from 'react'
import { ID, Query, Permission, Role } from 'appwrite'
import { useAuth } from '../context/AuthContext'
import { useExercise } from '../hooks/useExercise'
import { useAudioEngine } from '../hooks/useAudioEngine'
import { useLeveling } from '../hooks/useLeveling'
import { canLevelUp } from '../lib/progression'
import { nextTarget, levelNumber } from '../lib/levels'
import { pulseTap, squeezeBuzz, releaseBuzz, breakBuzz, completeCelebrate } from '../lib/haptics'
import { isBreakPhase } from '../lib/exercise-engine'
import { databases, DATABASE_ID, EXERCISES_COLLECTION } from '../lib/appwrite'
import type { Exercise as ExerciseDoc } from '../lib/types'
import PulseCircle from '../components/PulseCircle'
import RestBreak from '../components/RestBreak'
import CompletionOverlay from '../components/CompletionOverlay'

export default function Exercise() {
  const { profile, streakDays, updateProfile, refreshProfile } = useAuth()
  const target = profile?.currentTarget ?? 100
  const intervalMs = (profile?.pulseInterval ?? 1.5) * 1000

  const { state, elapsed, start, pause, resume, stop, reset, skip } = useExercise(target, intervalMs)
  const { squeezeChime, releaseChime, breakSound, completionFanfare, initAudio } = useAudioEngine()
  const { levelUp } = useLeveling(profile, updateProfile)
  const [showCompletion, setShowCompletion] = useState(false)
  const [pointsEarned, setPointsEarned] = useState(0)
  const [canAdvance, setCanAdvance] = useState(false)
  const prevPhase = useRef(state.phase)
  const prevPulses = useRef(state.pulsesCompleted)
  const startTimeRef = useRef<string>('')

  // Sound + haptics on phase changes (warmups, breaks, completion)
  useEffect(() => {
    const prev = prevPhase.current
    const curr = state.phase
    prevPhase.current = curr

    if (prev === curr) return

    // Warmup: ascending chime on squeeze/hold, descending on release
    if (curr === 'warmupA_hold' || curr === 'warmupB_hold') { squeezeChime(); squeezeBuzz() }
    if (curr === 'warmupA_rest' || curr === 'warmupB_rest') { releaseChime(); releaseBuzz() }

    // Breaks: distinct tone + buzz
    if (isBreakPhase(curr)) { breakSound(); breakBuzz() }

    // Haptic tap when entering the fast-pulse phase
    if (curr === 'pulse_tick' && prev !== 'pulse_tick') pulseTap()

    if (curr === 'completed') {
      completionFanfare()
      completeCelebrate()
      saveExercise()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase])

  // Haptic tap on every pulse tick (per-pulse feedback — no audio spam)
  useEffect(() => {
    const prev = prevPulses.current
    prevPulses.current = state.pulsesCompleted

    if (state.phase === 'pulse_tick' && state.pulsesCompleted > prev) {
      pulseTap()
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

      // Did this completion earn a level-up? (currentTarget/weekStartDate unchanged
      // by the points update above, so evaluating against `profile` is correct.)
      const res = await databases.listDocuments(DATABASE_ID, EXERCISES_COLLECTION, [
        Query.equal('userId', profile.userId),
        Query.orderDesc('date'),
        Query.limit(100),
      ])
      setCanAdvance(canLevelUp(res.documents as unknown as ExerciseDoc[], profile))
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
    setCanAdvance(false)
    reset()
    await refreshProfile()
  }

  const handleLevelUp = async () => {
    await levelUp()
    setShowCompletion(false)
    setCanAdvance(false)
    reset()
    await refreshProfile()
  }

  const { phase, isPaused } = state
  const isRunning = phase !== 'idle' && phase !== 'completed' && phase !== 'countdown'
  const nextLevelTarget = profile ? nextTarget(profile.currentTarget) : null

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
      {profile && phase === 'idle' && (
        <p className="text-text-dim text-sm mb-2">
          Level {levelNumber(profile.currentTarget)} · {profile.currentTarget} pulses
        </p>
      )}

      <PulseCircle state={state} />

      {isBreakPhase(phase) && <RestBreak state={state} />}

      <div className="w-full px-6 mt-8">
        {phase === 'idle' && (
          <div className="flex justify-center">
            <button
              onClick={handleStart}
              className="bg-primary text-white font-bold rounded-full px-10 py-4 text-lg active:scale-95 transition-transform"
            >
              Start
            </button>
          </div>
        )}

        {isRunning && (
          <div className="flex gap-3">
            <button
              onClick={isPaused ? resume : pause}
              className="flex-1 bg-surface border border-border text-text font-semibold rounded-full py-3 active:scale-95 transition-transform"
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={skip}
              className="flex-1 bg-surface border border-yellow/40 text-yellow font-semibold rounded-full py-3 active:scale-95 transition-transform"
            >
              {phase === 'pulse_tick' || phase === 'pulse_break' ? 'Finish' : 'Skip'}
            </button>
            <button
              onClick={stop}
              className="flex-1 bg-surface border border-primary text-primary font-semibold rounded-full py-3 active:scale-95 transition-transform"
            >
              Stop
            </button>
          </div>
        )}

        {phase === 'completed' && !showCompletion && (
          <div className="flex justify-center">
            <button
              onClick={() => setShowCompletion(true)}
              className="bg-primary text-white font-bold rounded-full px-10 py-4 text-lg active:scale-95 transition-transform"
            >
              View Results
            </button>
          </div>
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
          streakDays={streakDays}
          canLevelUp={canAdvance}
          nextTarget={nextLevelTarget}
          onLevelUp={handleLevelUp}
          onClose={handleCloseCompletion}
        />
      )}
    </div>
  )
}
