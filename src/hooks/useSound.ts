import { useCallback, useRef } from 'react'

let audioCtx: AudioContext | null = null
const bufferCache: Record<string, AudioBuffer> = {}

function getContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext()
  return audioCtx
}

async function loadBuffer(src: string): Promise<AudioBuffer> {
  if (bufferCache[src]) return bufferCache[src]
  const res = await fetch(src)
  const arrayBuf = await res.arrayBuffer()
  const buffer = await getContext().decodeAudioData(arrayBuf)
  bufferCache[src] = buffer
  return buffer
}

function playBuffer(buffer: AudioBuffer) {
  const ctx = getContext()
  if (ctx.state === 'suspended') ctx.resume()
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.connect(ctx.destination)
  source.start(0)
}

const SOUNDS = ['/chime-up.mp3', '/chime-down.mp3', '/beep.mp3', '/break-start.mp3', '/complete.mp3'] as const

export function useSound() {
  const buffersRef = useRef<Record<string, AudioBuffer>>({})

  const play = useCallback((src: string) => {
    const buf = buffersRef.current[src]
    if (buf) playBuffer(buf)
  }, [])

  const squeezeChime = useCallback(() => play('/chime-up.mp3'), [play])
  const releaseChime = useCallback(() => play('/chime-down.mp3'), [play])
  const fastBeep = useCallback(() => play('/beep.mp3'), [play])
  const breakSound = useCallback(() => play('/break-start.mp3'), [play])
  const completionFanfare = useCallback(() => play('/complete.mp3'), [play])

  const initAudio = useCallback(async () => {
    const ctx = getContext()
    if (ctx.state === 'suspended') await ctx.resume()
    const loaded = await Promise.all(SOUNDS.map((s) => loadBuffer(s)))
    SOUNDS.forEach((s, i) => { buffersRef.current[s] = loaded[i] })
  }, [])

  return { squeezeChime, releaseChime, fastBeep, breakSound, completionFanfare, initAudio }
}
