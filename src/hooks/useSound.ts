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
        up: createAudio('/up.mp3'),
        down: createAudio('/down.mp3'),
        beep: createAudio('/beep.mp3'),
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

  const squeezeUp = useCallback(() => play('up'), [play])
  const releaseDown = useCallback(() => play('down'), [play])
  const fastBeep = useCallback(() => play('beep'), [play])
  const breakChime = useCallback(() => play('break'), [play])
  const completionFanfare = useCallback(() => play('complete'), [play])

  const initAudio = useCallback(() => {
    const s = getSounds()
    Object.values(s).forEach((a) => {
      a.load()
      a.play().then(() => { a.pause(); a.currentTime = 0 }).catch(() => {})
    })
  }, [getSounds])

  return { squeezeUp, releaseDown, fastBeep, breakChime, completionFanfare, initAudio }
}
