import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSound } from '../hooks/useSound'
import { useElapsed } from '../hooks/useTimer'
import { parseTrainingState } from '../lib/training-state'
import { RUNNING, POINTS } from '../lib/program'
import { localDateISO } from '../lib/date'
import { logActivity, listActivityLogs } from '../lib/activity-log'
import { shouldRamp } from '../lib/progression'
import { completeCelebrate } from '../lib/haptics'

type Phase = 'idle' | 'running' | 'done'

export default function Run() {
  const { profile, updateProfile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const { fastBeep, completionFanfare, initAudio } = useSound()

  // Local YYYY-MM-DD (not toISOString which gives UTC)
  const today = useMemo(() => localDateISO(), [])

  const state = useMemo(
    () => (profile ? parseTrainingState(profile, today) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile?.trainingState, today],
  )

  const [phase, setPhase] = useState<Phase>('idle')
  const [paused, setPaused] = useState(false)
  const [canRamp, setCanRamp] = useState(false)

  const { elapsed } = useElapsed(phase === 'running' && !paused)
  const elapsedRef = useRef(0)
  elapsedRef.current = elapsed

  // Soft beep each completed minute
  const lastBeepMinRef = useRef(0)
  useEffect(() => {
    const min = Math.floor(elapsed / 60)
    if (elapsed > 0 && min > 0 && min !== lastBeepMinRef.current) {
      lastBeepMinRef.current = min
      fastBeep()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed])

  // Completion side-effects (log + progression check)
  useEffect(() => {
    if (phase !== 'done' || !profile || !state) return
    completionFanfare()
    completeCelebrate()

    const durationSec = elapsedRef.current
    void (async () => {
      await logActivity({ userId: profile.userId, type: 'run', completed: true, durationSec })
      await updateProfile({ totalPoints: profile.totalPoints + (POINTS.run ?? 0) })
      const logs = await listActivityLogs(profile.userId)
      if (shouldRamp(logs, { type: 'run', sinceISO: state.levelStart.run })) {
        setCanRamp(true)
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleStart = () => {
    initAudio()
    setPhase('running')
  }

  const handleFinish = () => {
    setPhase('done')
  }

  const handleRamp = async () => {
    if (!profile || !state) return
    await updateProfile({
      trainingState: JSON.stringify({
        ...state,
        runMinutes: state.runMinutes + RUNNING.rampStepMinutes,
        levelStart: { ...state.levelStart, run: today },
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
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
        <h1 className="text-text font-bold text-2xl">Running</h1>
        <p className="text-text-dim text-sm text-center">
          Target: {state?.runMinutes ?? RUNNING.startMinutes} min · easy pace
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
        <h1 className="text-green font-bold text-3xl">Run done!</h1>
        <p className="text-text-dim text-sm">
          {mins}:{String(secs).padStart(2, '0')} total
        </p>

        {canRamp && (
          <div className="w-full bg-surface border border-green/30 rounded-2xl p-5">
            <p className="text-green font-semibold mb-3">Increase your run target?</p>
            <p className="text-text-dim text-sm mb-4">
              You've been consistent! Add {RUNNING.rampStepMinutes} minutes to your target.
            </p>
            <button
              onClick={handleRamp}
              className="w-full bg-green text-white font-bold rounded-full py-3 active:scale-95 transition-transform"
            >
              Add {RUNNING.rampStepMinutes} min
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

  const runMinutes = state?.runMinutes ?? RUNNING.startMinutes
  const elapsedMins = Math.floor(elapsed / 60)
  const elapsedSecs = elapsed % 60

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6">
      {/* Target */}
      <p className="text-text-dim text-sm">Target: {runMinutes} min · easy pace</p>

      {/* Elapsed time count-up */}
      <div className="flex flex-col items-center gap-1">
        <p className="text-text font-bold text-7xl tabular-nums">
          {elapsedMins}:{String(elapsedSecs).padStart(2, '0')}
        </p>
        <p className="text-text-dim text-sm">elapsed</p>
      </div>

      {/* Controls */}
      <div className="w-full flex flex-col gap-3">
        <button
          onClick={handleFinish}
          className="w-full bg-green text-white font-bold rounded-full py-4 text-lg active:scale-95 transition-transform"
        >
          Finish
        </button>
        <button
          onClick={() => setPaused((p) => !p)}
          className="w-full bg-surface border border-border text-text-dim font-semibold rounded-full py-3 active:scale-95 transition-transform"
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
      </div>
    </div>
  )
}
