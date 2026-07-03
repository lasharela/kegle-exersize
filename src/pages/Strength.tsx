import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSound } from '../hooks/useSound'
import { useTimer, useElapsed } from '../hooks/useTimer'
import { buildSteps, useCircuit } from '../hooks/useCircuit'
import { parseTrainingState } from '../lib/training-state'
import { STRENGTH_CIRCUIT, POINTS } from '../lib/program'
import { localDateISO } from '../lib/date'
import { logActivity, listActivityLogs } from '../lib/activity-log'
import { shouldRamp } from '../lib/progression'
import { pulseTap, squeezeBuzz, breakBuzz, completeCelebrate } from '../lib/haptics'
import { useSessionGuard, useRequestExit } from '../context/SessionGuardContext'
import ExerciseCard from '../components/ExerciseCard'
import RestTimer from '../components/RestTimer'

type Phase = 'idle' | 'running' | 'done'

export default function Strength() {
  const { profile, updateProfile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const { squeezeChime, fastBeep, breakSound, completionFanfare, initAudio } = useSound()

  // Local YYYY-MM-DD (not toISOString which gives UTC)
  const today = useMemo(() => localDateISO(), [])

  const state = useMemo(
    () => (profile ? parseTrainingState(profile, today) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile?.trainingState, today],
  )

  const repsByKey = state?.strength ?? {}

  const steps = useMemo(
    () => (state ? buildSteps(STRENGTH_CIRCUIT, state.strength) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(repsByKey)],
  )

  const [phase, setPhase] = useState<Phase>('idle')
  const [restRemaining, setRestRemaining] = useState(0)
  const [canRamp, setCanRamp] = useState(false)

  const { index, step, done, next } = useCircuit(steps)

  const { elapsed } = useElapsed(phase === 'running')
  const elapsedRef = useRef(0)
  elapsedRef.current = elapsed

  // True once the current rest's countdown has actually ticked. Prevents the
  // auto-advance effect from firing on the rest-entry render (where
  // restRemaining is still the stale 0 from the previous rest / initial state).
  const restTickedRef = useRef(false)

  // Derived: is the rest countdown timer active?
  const isRestActive = phase === 'running' && step?.kind === 'rest'

  // Initialise rest timer when we land on a rest step
  useEffect(() => {
    if (phase !== 'running' || step?.kind !== 'rest') return
    setRestRemaining(step.restSec)
    restTickedRef.current = false // not yet ticked — block auto-advance on entry
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, phase])

  // Tick the rest countdown (mark that ticking has begun so 0 means "ran out")
  useTimer(() => {
    restTickedRef.current = true
    setRestRemaining((r) => Math.max(0, r - 1))
  }, 1000, isRestActive)

  // Auto-advance when rest runs out — only after the countdown has actually
  // ticked, never on the entry render where restRemaining is still stale (0).
  useEffect(() => {
    if (!isRestActive || restRemaining > 0 || !restTickedRef.current) return
    breakSound()
    breakBuzz()
    next()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restRemaining, isRestActive])

  // Transition to done when all steps are consumed
  useEffect(() => {
    if (phase !== 'running' || !done) return
    setPhase('done')
  }, [done, phase])

  // Completion side-effects (log + progression check)
  useEffect(() => {
    if (phase !== 'done' || !profile || !state) return
    completionFanfare()
    completeCelebrate()

    const durationSec = elapsedRef.current
    void (async () => {
      await logActivity({
        userId: profile.userId,
        type: 'strength',
        completed: true,
        durationSec,
        payload: { reps: repsByKey },
      })
      await updateProfile({ totalPoints: profile.totalPoints + (POINTS.strength ?? 0) })
      const logs = await listActivityLogs(profile.userId)
      if (shouldRamp(logs, { type: 'strength', sinceISO: state.levelStart.strength })) {
        setCanRamp(true)
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // Exiting mid-session saves a partial log instead of losing everything.
  const requestExit = useRequestExit()
  useSessionGuard(phase === 'running', async () => {
    if (!profile) return
    await logActivity({
      userId: profile.userId,
      type: 'strength',
      completed: false,
      durationSec: elapsedRef.current,
      payload: { reps: repsByKey, stoppedAtStep: index },
    })
  })

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleStart = () => {
    if (!profile) return
    initAudio()
    setPhase('running')
    squeezeChime()
    squeezeBuzz()
  }

  const handleDoneSet = () => {
    fastBeep()
    pulseTap()
    next()
  }

  const handleSkipRest = () => {
    breakSound()
    breakBuzz()
    next()
  }

  const handleAddTime = () => setRestRemaining((r) => r + 15)

  const handleLevelUp = async () => {
    if (!profile || !state) return
    const newStrength = Object.fromEntries(
      STRENGTH_CIRCUIT.map((e) => [e.key, (repsByKey[e.key] ?? e.startReps) + e.rampStep]),
    )
    await updateProfile({
      trainingState: JSON.stringify({
        ...state,
        strength: newStrength,
        levelStart: { ...state.levelStart, strength: today },
      }),
    })
    await refreshProfile()
  }

  // ── Guard ─────────────────────────────────────────────────────────────────

  if (!profile) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-text-dim">Loading…</p>
      </div>
    )
  }

  // ── Idle screen ───────────────────────────────────────────────────────────

  if (phase === 'idle') {
    const totalSets = STRENGTH_CIRCUIT.reduce((n, e) => n + e.sets, 0)
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
        <h1 className="text-text font-bold text-2xl">Strength Circuit</h1>
        <p className="text-text-dim text-sm text-center">
          {STRENGTH_CIRCUIT.length} exercises · {totalSets} sets · full body
        </p>
        <button
          onClick={handleStart}
          className="bg-primary text-white font-bold rounded-full px-10 py-4 text-lg active:scale-95 transition-transform"
        >
          Start
        </button>
      </div>
    )
  }

  // ── Done screen ───────────────────────────────────────────────────────────

  if (phase === 'done') {
    const mins = Math.floor(elapsed / 60)
    const secs = elapsed % 60
    return (
      <div className="flex-1 flex flex-col items-center px-6 py-8 gap-6 overflow-y-auto">
        <h1 className="text-green font-bold text-3xl">Circuit Complete!</h1>
        <p className="text-text-dim text-sm">
          {mins}:{String(secs).padStart(2, '0')} total
        </p>

        {canRamp && (
          <div className="w-full bg-surface border border-green/30 rounded-2xl p-5">
            <p className="text-green font-semibold mb-3">Level up your circuit?</p>
            <ul className="space-y-1 mb-4">
              {STRENGTH_CIRCUIT.map((e) => {
                const cur = repsByKey[e.key] ?? e.startReps
                const next = cur + e.rampStep
                return (
                  <li key={e.key} className="text-text-dim text-sm flex justify-between">
                    <span>{e.name}</span>
                    <span className="text-text">
                      {cur} → {next}
                      {e.perSide ? ' / side' : ' reps'}
                    </span>
                  </li>
                )
              })}
            </ul>
            <button
              onClick={handleLevelUp}
              className="w-full bg-green text-white font-bold rounded-full py-3 active:scale-95 transition-transform"
            >
              Level Up
            </button>
          </div>
        )}

        <button
          onClick={() => navigate('/')}
          className="w-full bg-surface border border-border text-text font-semibold rounded-full py-3 active:scale-95 transition-transform"
        >
          Back to Dashboard
        </button>
      </div>
    )
  }

  // ── Running screen ────────────────────────────────────────────────────────

  // Guard against the one-render window between last next() and phase='done'
  if (!step) return null

  const totalSteps = steps.length
  const elapsedMins = Math.floor(elapsed / 60)
  const elapsedSecs = elapsed % 60

  return (
    <div className="flex-1 flex flex-col px-4 py-4 gap-4">
      {/* Progress header + explicit End control */}
      <div className="relative">
        <p className="text-text-dim text-xs text-center py-1">
          Step {index + 1} of {totalSteps}
        </p>
        <button
          onClick={() => requestExit('/')}
          aria-label="End session"
          className="absolute right-0 top-1/2 -translate-y-1/2 text-text-dim text-xs border border-border rounded-full px-3 py-1 active:opacity-70"
        >
          ✕ End
        </button>
      </div>

      {step.kind === 'exercise' && (
        <>
          <ExerciseCard
            exercise={step.exercise}
            setIndex={step.setIndex}
            totalSets={step.totalSets}
            reps={step.reps}
          />
          <div className="mt-auto pb-2">
            <button
              onClick={handleDoneSet}
              className="w-full bg-primary text-white font-bold rounded-full py-4 text-lg active:scale-95 transition-transform"
            >
              Done set
            </button>
          </div>
        </>
      )}

      {step.kind === 'rest' && (
        <RestTimer
          remaining={restRemaining}
          onSkip={handleSkipRest}
          onAdd={handleAddTime}
        />
      )}

      <p className="text-text-dim text-xs text-center">
        {elapsedMins}:{String(elapsedSecs).padStart(2, '0')} elapsed
      </p>
    </div>
  )
}
