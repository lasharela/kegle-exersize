import { useCallback, useRef } from 'react'
import { soundEnabled } from '../lib/settings'

function createAudio(src: string) {
  const audio = new Audio(src)
  audio.preload = 'auto'
  return audio
}

// iOS 16.4+: route audio through the "playback" session so cues are audible even
// when the hardware silent switch is on. Best-effort; ignored where unsupported.
function enablePlaybackSession() {
  try {
    const nav = navigator as unknown as { audioSession?: { type: string } }
    if (nav.audioSession) nav.audioSession.type = 'playback'
  } catch {
    /* unsupported — ignore */
  }
}

export function useSound() {
  const sounds = useRef<Record<string, HTMLAudioElement> | null>(null)

  const getSounds = useCallback(() => {
    if (!sounds.current) {
      sounds.current = {
        chimeUp: createAudio('/chime-up.mp3'),
        chimeDown: createAudio('/chime-down.mp3'),
        beep: createAudio('/beep.mp3'),
        breakStart: createAudio('/break-start.mp3'),
        complete: createAudio('/complete.mp3'),
      }
    }
    return sounds.current
  }, [])

  const play = useCallback((name: string) => {
    if (!soundEnabled()) return
    const s = getSounds()[name]
    if (!s) return
    s.currentTime = 0
    s.play().catch(() => {})
  }, [getSounds])

  const squeezeChime = useCallback(() => play('chimeUp'), [play])
  const releaseChime = useCallback(() => play('chimeDown'), [play])
  const fastBeep = useCallback(() => play('beep'), [play])
  const breakSound = useCallback(() => play('breakStart'), [play])
  const completionFanfare = useCallback(() => play('complete'), [play])

  const initAudio = useCallback(() => {
    enablePlaybackSession()
    const s = getSounds()
    Object.values(s).forEach((a) => {
      a.load()
      a.play().then(() => { a.pause(); a.currentTime = 0 }).catch(() => {})
    })
  }, [getSounds])

  return { squeezeChime, releaseChime, fastBeep, breakSound, completionFanfare, initAudio }
}
