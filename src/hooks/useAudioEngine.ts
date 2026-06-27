import { useCallback, useRef } from 'react'
import { soundEnabled } from '../lib/settings'

// Synthesized cues via Web Audio. Used only for low-frequency phase transitions
// (squeeze / release / break / completion) — the rapid per-pulse feedback is the
// haptic tap, so we never spam audio playback (the source of iOS lag).
type Note = [freq: number, start: number, duration: number]

export function useAudioEngine() {
  const ctxRef = useRef<AudioContext | null>(null)

  const getCtx = useCallback((): AudioContext | null => {
    if (!ctxRef.current) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      ctxRef.current = new AC()
    }
    return ctxRef.current
  }, [])

  const tone = useCallback(
    (freq: number, start: number, duration: number, peak = 0.2) => {
      const ctx = getCtx()
      if (!ctx) return
      const t0 = ctx.currentTime + start
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, t0)
      gain.gain.setValueAtTime(0.0001, t0)
      gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t0)
      osc.stop(t0 + duration + 0.02)
    },
    [getCtx]
  )

  const play = useCallback(
    (notes: Note[]) => {
      if (!soundEnabled()) return
      const ctx = getCtx()
      if (!ctx) return
      if (ctx.state === 'suspended') void ctx.resume()
      notes.forEach(([freq, start, dur]) => tone(freq, start, dur))
    },
    [getCtx, tone]
  )

  // C5 -> G5 ascending
  const squeezeChime = useCallback(() => play([[523, 0, 0.12], [784, 0.1, 0.16]]), [play])
  // G5 -> C5 descending
  const releaseChime = useCallback(() => play([[784, 0, 0.12], [523, 0.1, 0.16]]), [play])
  // A4 soft mid tone
  const breakSound = useCallback(() => play([[440, 0, 0.25]]), [play])
  // C-E-G-C arpeggio
  const completionFanfare = useCallback(
    () => play([[523, 0, 0.15], [659, 0.12, 0.15], [784, 0.24, 0.15], [1047, 0.36, 0.3]]),
    [play]
  )

  // Unlock the AudioContext on the user's Start gesture (required by iOS).
  const initAudio = useCallback(() => {
    const ctx = getCtx()
    if (ctx && ctx.state === 'suspended') void ctx.resume()
    tone(440, 0, 0.001, 0.0001)
  }, [getCtx, tone])

  return { squeezeChime, releaseChime, breakSound, completionFanfare, initAudio }
}
