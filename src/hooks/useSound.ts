import { useCallback, useRef } from 'react'

function createAudio(src: string) {
  const audio = new Audio(src)
  audio.preload = 'auto'
  return audio
}

export function useSound() {
  const sounds = useRef<Record<string, HTMLAudioElement> | null>(null)

  const getSounds = useCallback(() => {
    if (!sounds.current) {
      sounds.current = {
        squeeze: createAudio('/squeeze.mp3'),
        release: createAudio('/release.mp3'),
        break: createAudio('/break.mp3'),
        complete: createAudio('/complete.mp3'),
      }
    }
    return sounds.current
  }, [])

  const play = useCallback((name: string) => {
    const s = getSounds()[name]
    if (!s) return
    s.currentTime = 0
    s.play().catch(() => {})
  }, [getSounds])

  const pulseClick = useCallback(() => play('squeeze'), [play])
  const releaseClick = useCallback(() => play('release'), [play])
  const breakChime = useCallback(() => play('break'), [play])
  const completionFanfare = useCallback(() => play('complete'), [play])

  const initAudio = useCallback(() => {
    // Preload all sounds on first user interaction
    const s = getSounds()
    Object.values(s).forEach((a) => {
      a.load()
      // Play and immediately pause to unlock audio on iOS/Chrome
      a.play().then(() => { a.pause(); a.currentTime = 0 }).catch(() => {})
    })
  }, [getSounds])

  return { pulseClick, releaseClick, breakChime, completionFanfare, initAudio }
}
