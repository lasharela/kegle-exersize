import { soundEnabled } from './settings'
import { primeAudioSession, startSilentKeepAlive } from './audio-session'

export type SoundName = 'chimeUp' | 'chimeDown' | 'beep' | 'breakStart' | 'complete'
type WebAudioWindow = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }

const SOUND_URLS: Record<SoundName, string> = {
  chimeUp: '/chime-up.mp3',
  chimeDown: '/chime-down.mp3',
  beep: '/beep.mp3',
  breakStart: '/break-start.mp3',
  complete: '/complete.mp3',
}

const POOL_SIZE: Record<SoundName, number> = {
  chimeUp: 3,
  chimeDown: 3,
  beep: 6,
  breakStart: 2,
  complete: 2,
}

let audioContext: AudioContext | null = null
const buffers = new Map<SoundName, AudioBuffer>()
const loading = new Map<SoundName, Promise<void>>()
const fallbackPools = new Map<SoundName, HTMLAudioElement[]>()
let unlocked = false

function audioConstructor() {
  return window.AudioContext ?? (window as WebAudioWindow).webkitAudioContext
}

function ensureContext(): AudioContext | null {
  if (audioContext) return audioContext
  const Ctor = audioConstructor()
  if (!Ctor) return null
  audioContext = new Ctor()
  return audioContext
}

function createAudio(src: string) {
  const audio = new Audio(src)
  audio.preload = 'auto'
  audio.setAttribute('playsinline', '')
  audio.style.display = 'none'
  document.body.appendChild(audio)
  return audio
}

function fallbackPool(name: SoundName) {
  let pool = fallbackPools.get(name)
  if (!pool) {
    pool = Array.from({ length: POOL_SIZE[name] }, () => createAudio(SOUND_URLS[name]))
    fallbackPools.set(name, pool)
  }
  return pool
}

function playFallback(name: SoundName) {
  const pool = fallbackPool(name)
  const audio = pool.find((a) => a.paused || a.ended) ?? pool.reduce((oldest, a) => (
    a.currentTime > oldest.currentTime ? a : oldest
  ), pool[0])
  try {
    audio.pause()
    audio.currentTime = 0
    void audio.play().catch(() => {})
  } catch {
    /* unavailable media path; Web Audio may still work next cue */
  }
}

async function loadBuffer(name: SoundName) {
  if (buffers.has(name)) return
  const ctx = ensureContext()
  if (!ctx) return
  const existing = loading.get(name)
  if (existing) return existing
  const promise = fetch(SOUND_URLS[name])
    .then((res) => {
      if (!res.ok) throw new Error(`failed to load ${SOUND_URLS[name]}`)
      return res.arrayBuffer()
    })
    .then((data) => ctx.decodeAudioData(data))
    .then((buffer) => { buffers.set(name, buffer) })
    .catch(() => {
      /* fallback Audio elements handle this cue type if decode/load fails */
    })
  loading.set(name, promise)
  return promise
}

function playBuffer(name: SoundName, ctx: AudioContext) {
  const buffer = buffers.get(name)
  if (!buffer) return false
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.connect(ctx.destination)
  source.start(ctx.currentTime + 0.005)
  return true
}

function unlockContext(ctx: AudioContext) {
  if (unlocked) return
  const source = ctx.createBufferSource()
  source.buffer = ctx.createBuffer(1, 1, ctx.sampleRate)
  const gain = ctx.createGain()
  gain.gain.value = 0
  source.connect(gain)
  gain.connect(ctx.destination)
  source.start()
  unlocked = true
}

export async function unlockSoundEngine() {
  primeAudioSession()
  startSilentKeepAlive()
  Object.keys(SOUND_URLS).forEach((name) => fallbackPool(name as SoundName).forEach((audio) => audio.load()))

  const ctx = ensureContext()
  if (!ctx) return
  try {
    if (ctx.state !== 'running') await ctx.resume()
    unlockContext(ctx)
    await Promise.all(Object.keys(SOUND_URLS).map((name) => loadBuffer(name as SoundName)))
  } catch {
    /* HTMLAudio fallback remains available */
  }
}

export function playSound(name: SoundName) {
  if (!soundEnabled()) return
  primeAudioSession()
  void startSilentKeepAlive()

  const ctx = ensureContext()
  if (!ctx) {
    playFallback(name)
    return
  }

  if (ctx.state !== 'running') void ctx.resume().catch(() => {})
  if (playBuffer(name, ctx)) return

  void loadBuffer(name)
  playFallback(name)
}
