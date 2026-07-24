import { soundEnabled } from './settings'
import { primeAudioSession, startSilentKeepAlive, stopSilentKeepAlive } from './audio-session'

export type SoundName = 'chimeUp' | 'chimeDown' | 'beep' | 'breakStart' | 'complete'
type WebAudioWindow = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }

const SOUND_URLS: Record<SoundName, string> = {
  chimeUp: '/chime-up.mp3',
  chimeDown: '/chime-down.mp3',
  beep: '/beep.wav',
  breakStart: '/break-start.mp3',
  complete: '/complete.mp3',
}

let audioContext: AudioContext | null = null
const buffers = new Map<SoundName, AudioBuffer>()
const loading = new Map<SoundName, Promise<void>>()
const mediaUrls = new Map<SoundName, string>()
const mediaLoading = new Map<SoundName, Promise<void>>()
let mediaPlayer: HTMLAudioElement | null = null
let webAudioUnlocked = false
let mediaUnlocked = false
let lastError: string | null = null

function isStandalone() {
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  return 'standalone' in navigator && !!(navigator as unknown as { standalone: boolean }).standalone
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

// WebKit has an open bug where a PWA AudioContext can remain "running" while
// producing silence after relaunch. A single HTMLAudioElement is the more
// reliable path on installed iOS apps and follows Apple's one-stream guidance.
function shouldUseMediaElement() {
  return isIOS() && isStandalone()
}

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

function ensureMediaPlayer() {
  if (!mediaPlayer) {
    mediaPlayer = new Audio()
    mediaPlayer.preload = 'auto'
    mediaPlayer.setAttribute('playsinline', '')
    mediaPlayer.style.display = 'none'
    document.body.appendChild(mediaPlayer)
  }
  return mediaPlayer
}

function loadMedia(name: SoundName) {
  if (mediaUrls.has(name)) return Promise.resolve()
  const existing = mediaLoading.get(name)
  if (existing) return existing
  const promise = fetch(SOUND_URLS[name])
    .then((res) => {
      if (!res.ok) throw new Error(`failed to load ${SOUND_URLS[name]}`)
      return res.blob()
    })
    .then((blob) => { mediaUrls.set(name, URL.createObjectURL(blob)) })
    .catch((error: unknown) => {
      lastError = error instanceof Error ? error.message : 'media preload failed'
    })
  mediaLoading.set(name, promise)
  return promise
}

async function playMedia(name: SoundName) {
  const player = ensureMediaPlayer()
  const resetSource = shouldUseMediaElement()
  const src = resetSource ? SOUND_URLS[name] : (mediaUrls.get(name) ?? SOUND_URLS[name])
  try {
    player.pause()
    if (resetSource) {
      // iOS 26 can keep an installed app's media pipeline in a silent state
      // across launches. Clearing and reassigning src immediately before play
      // forces WebKit to rebuild that pipeline.
      player.removeAttribute('src')
      player.load()
      player.src = src
      player.load()
    } else if (player.getAttribute('src') !== src) {
      player.src = src
      player.load()
    } else {
      player.currentTime = 0
    }
    // This call must occur before the first await when invoked by Start/Resume.
    await player.play()
    mediaUnlocked = true
    lastError = null
    return true
  } catch (error) {
    lastError = error instanceof Error ? error.message : 'media playback was blocked'
    return false
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
  if (webAudioUnlocked) return
  const source = ctx.createBufferSource()
  source.buffer = ctx.createBuffer(1, 1, ctx.sampleRate)
  const gain = ctx.createGain()
  gain.gain.value = 0
  source.connect(gain)
  gain.connect(ctx.destination)
  source.start()
  webAudioUnlocked = true
}

export function preloadSoundEngine() {
  ensureMediaPlayer()
  if (shouldUseMediaElement()) return
  for (const name of Object.keys(SOUND_URLS) as SoundName[]) void loadMedia(name)
  for (const name of Object.keys(SOUND_URLS) as SoundName[]) void loadBuffer(name)
}

export async function unlockSoundEngine(confirmation?: SoundName) {
  if (!soundEnabled()) return false
  primeAudioSession()
  preloadSoundEngine()

  if (shouldUseMediaElement()) {
    stopSilentKeepAlive()
    const cue = confirmation ?? (mediaUnlocked ? null : 'chimeUp')
    return cue ? playMedia(cue) : true
  }

  const ctx = ensureContext()
  if (!ctx) return playMedia(confirmation ?? 'chimeUp')
  try {
    startSilentKeepAlive()
    if (ctx.state !== 'running') await ctx.resume()
    unlockContext(ctx)
    await Promise.all(Object.keys(SOUND_URLS).map((name) => loadBuffer(name as SoundName)))
    if (confirmation && playBuffer(confirmation, ctx)) return true
    lastError = null
    return true
  } catch (error) {
    lastError = error instanceof Error ? error.message : 'Web Audio unlock failed'
    return playMedia(confirmation ?? 'chimeUp')
  }
}

export function playSound(name: SoundName) {
  if (!soundEnabled()) return
  primeAudioSession()

  if (shouldUseMediaElement()) {
    void playMedia(name)
    return
  }

  const ctx = ensureContext()
  if (!ctx) {
    void playMedia(name)
    return
  }

  if (ctx.state !== 'running') void ctx.resume().catch(() => {})
  if (playBuffer(name, ctx)) return

  void loadBuffer(name)
  void playMedia(name)
}

export function soundEngineInfo() {
  return {
    mode: shouldUseMediaElement() ? 'iOS media element' : 'Web Audio',
    unlocked: shouldUseMediaElement() ? mediaUnlocked : webAudioUnlocked,
    state: shouldUseMediaElement() ? (mediaPlayer?.paused ? 'paused' : 'playing') : (audioContext?.state ?? 'not created'),
    lastError,
  }
}
