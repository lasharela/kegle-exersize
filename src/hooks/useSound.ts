import { useCallback, useRef } from 'react'
import { soundEnabled } from '../lib/settings'
import { primeAudioSession, startSilentKeepAlive } from '../lib/audio-session'

// Cues play through Web Audio (decoded mp3 buffers), NOT HTML5 <audio>. In a
// standalone iOS PWA, HTML5 <audio> is routed to the ringer channel (muted by the
// silent switch); Web Audio, kept on the media channel by a continuously-playing
// silent track (see audio-session.ts), is audible even when the phone is silenced.
// Web Audio buffer sources also have no rapid-replay lag (good for fast pulses).
const FILES: Record<string, string> = {
  chimeUp: '/chime-up.mp3',
  chimeDown: '/chime-down.mp3',
  beep: '/beep.mp3',
  breakStart: '/break-start.mp3',
  complete: '/complete.mp3',
}

function createCtx(): AudioContext | null {
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  return AC ? new AC() : null
}

export function useSound() {
  const ctxRef = useRef<AudioContext | null>(null)
  const buffersRef = useRef<Record<string, AudioBuffer>>({})

  const ensureBuffers = useCallback(async (ctx: AudioContext) => {
    await Promise.all(
      Object.entries(FILES).map(async ([name, url]) => {
        if (buffersRef.current[name]) return
        try {
          const res = await fetch(url)
          const arr = await res.arrayBuffer()
          buffersRef.current[name] = await ctx.decodeAudioData(arr)
        } catch {
          /* leave undefined — that cue becomes a no-op */
        }
      })
    )
  }, [])

  const play = useCallback((name: string) => {
    if (!soundEnabled()) return
    const ctx = ctxRef.current
    const buf = buffersRef.current[name]
    if (!ctx || !buf) return
    if (ctx.state === 'suspended') void ctx.resume()
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(ctx.destination)
    src.start()
  }, [])

  const squeezeChime = useCallback(() => play('chimeUp'), [play])
  const releaseChime = useCallback(() => play('chimeDown'), [play])
  const fastBeep = useCallback(() => play('beep'), [play])
  const breakSound = useCallback(() => play('breakStart'), [play])
  const completionFanfare = useCallback(() => play('complete'), [play])

  // Unlock on the user's Start gesture: set the playback session, start the silent
  // media-channel track, create + resume the AudioContext, and decode the cues.
  const initAudio = useCallback(() => {
    primeAudioSession()
    startSilentKeepAlive()
    if (!ctxRef.current) ctxRef.current = createCtx()
    const ctx = ctxRef.current
    if (!ctx) return
    if (ctx.state === 'suspended') void ctx.resume()
    void ensureBuffers(ctx)
  }, [ensureBuffers])

  return { squeezeChime, releaseChime, fastBeep, breakSound, completionFanfare, initAudio }
}
