import { useCallback } from 'react'
import { playSound, unlockSoundEngine, type SoundName } from '../lib/sound-player'

export function useSound() {
  const play = useCallback((name: SoundName) => {
    playSound(name)
  }, [])

  const squeezeChime = useCallback(() => play('chimeUp'), [play])
  const releaseChime = useCallback(() => play('chimeDown'), [play])
  const fastBeep = useCallback(() => play('beep'), [play])
  const breakSound = useCallback(() => play('breakStart'), [play])
  const completionFanfare = useCallback(() => play('complete'), [play])

  const initAudio = useCallback(() => {
    void unlockSoundEngine()
  }, [])

  return { squeezeChime, releaseChime, fastBeep, breakSound, completionFanfare, initAudio }
}
