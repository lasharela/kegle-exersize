import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSound } from '../hooks/useSound'
import { useTimer, useElapsed } from '../hooks/useTimer'
import { WARMUP } from '../lib/program'
import ExerciseMedia from '../components/ExerciseMedia'
import { logActivity } from '../lib/activity-log'
import { squeezeBuzz, releaseBuzz, completeCelebrate } from '../lib/haptics'

type Phase = 'idle' | 'running' | 'done'

export default function Warmup() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { squeezeChime, releaseChime, completionFanfare, initAudio } = useSound()

  const [phase, setPhase] = useState<Phase>('idle')
  const [moveIndex, setMoveIndex] = useState(0)
  const [remaining, setRemaining] = useState(0)

  const { elapsed } = useElapsed(phase === 'running')
  const elapsedRef = useRef(0)
  elapsedRef.current = elapsed

  // Prevents auto-advance from firing on the entry render where remaining is
  // still the stale 0 from the previous move / initial state.
  const tickedRef = useRef(false)

  // ── Init effect (must be BEFORE the auto-advance effect) ─────────────────
  // Resets remaining and blocks auto-advance on entry to each new move.
  useEffect(() => {
    if (phase !== 'running') return
    setRemaining(WARMUP[moveIndex].durationSec)
    tickedRef.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveIndex, phase])

  // ── Timer tick ────────────────────────────────────────────────────────────
  useTimer(() => {
    tickedRef.current = true
    setRemaining((r) => Math.max(0, r - 1))
  }, 1000, phase === 'running')

  // ── Auto-advance effect (must be AFTER the init effect) ──────────────────
  // Only fires when the countdown has actually reached zero via ticking.
  useEffect(() => {
    if (phase !== 'running' || remaining > 0 || !tickedRef.current) return
    advanceMove()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, phase])

  // ── Completion side-effects ───────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'done' || !profile) return
    completionFanfare()
    completeCelebrate()

    const durationSec = elapsedRef.current
    void (async () => {
      await logActivity({
        userId: profile.userId,
        type: 'warmup',
        completed: true,
        durationSec,
      })
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ── Helpers ───────────────────────────────────────────────────────────────

  function advanceMove() {
    releaseChime()
    releaseBuzz()
    if (moveIndex >= WARMUP.length - 1) {
      setPhase('done')
    } else {
      setMoveIndex((i) => i + 1)
    }
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
        <h1 className="text-text font-bold text-2xl">Warm-up</h1>
        <p className="text-text-dim text-sm text-center">~{WARMUP.length} moves</p>
        <button
          onClick={() => {
            initAudio()
            setPhase('running')
            setMoveIndex(0)
            squeezeChime()
            squeezeBuzz()
          }}
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
      <div className="flex-1 flex flex-col items-center px-6 py-8 gap-6">
        <h1 className="text-green font-bold text-3xl">Warm-up done!</h1>
        <p className="text-text-dim text-sm">
          {mins}:{String(secs).padStart(2, '0')} total
        </p>
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

  const move = WARMUP[moveIndex]
  const elapsedMins = Math.floor(elapsed / 60)
  const elapsedSecs = elapsed % 60

  return (
    <div className="flex-1 flex flex-col px-4 py-4 gap-4">
      {/* Progress header */}
      <p className="text-text-dim text-xs text-center">
        Move {moveIndex + 1} of {WARMUP.length}
      </p>

      {/* Looping video — plays on iOS standalone (unlike GIFs); contain, height-capped */}
      <ExerciseMedia
        mediaKey={move.mediaKey}
        name={move.name}
        className="w-full rounded-2xl object-contain bg-surface border border-border"
        style={{ maxHeight: '40vh' }}
      />

      {/* Move name */}
      <h2 className="text-text font-bold text-xl text-center">{move.name}</h2>

      {/* Countdown */}
      <div className="flex-1 flex flex-col items-center justify-center gap-2">
        <p className="text-text font-bold text-6xl tabular-nums">{remaining}</p>
        <p className="text-text-dim text-sm">seconds</p>
      </div>

      {/* Skip button */}
      <div className="pb-2">
        <button
          onClick={advanceMove}
          className="w-full bg-surface border border-border text-text-dim font-semibold rounded-full py-3 active:scale-95 transition-transform"
        >
          Skip
        </button>
      </div>

      {/* Elapsed footer */}
      <p className="text-text-dim text-xs text-center">
        {elapsedMins}:{String(elapsedSecs).padStart(2, '0')} elapsed
      </p>
    </div>
  )
}
