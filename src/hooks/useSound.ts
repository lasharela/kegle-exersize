import { useCallback, useRef } from 'react'

let audioCtx: AudioContext | null = null
function getCtx() {
  if (!audioCtx) audioCtx = new AudioContext()
  return audioCtx
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.15) {
  const ctx = getCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(volume, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + duration)
}

export function useSound() {
  const enabled = useRef(true)

  const pulseClick = useCallback(() => {
    if (!enabled.current) return
    playTone(800, 0.08, 'square', 0.1)
  }, [])

  const releaseClick = useCallback(() => {
    if (!enabled.current) return
    playTone(400, 0.08, 'square', 0.08)
  }, [])

  const breakChime = useCallback(() => {
    if (!enabled.current) return
    playTone(523, 0.15, 'sine', 0.12)
    setTimeout(() => playTone(659, 0.15, 'sine', 0.12), 150)
    setTimeout(() => playTone(784, 0.2, 'sine', 0.12), 300)
  }, [])

  const completionFanfare = useCallback(() => {
    if (!enabled.current) return
    const notes = [523, 659, 784, 1047]
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.3, 'sine', 0.15), i * 150)
    })
  }, [])

  const initAudio = useCallback(() => {
    const ctx = getCtx()
    if (ctx.state === 'suspended') ctx.resume()
  }, [])

  return { pulseClick, releaseClick, breakChime, completionFanfare, initAudio }
}
