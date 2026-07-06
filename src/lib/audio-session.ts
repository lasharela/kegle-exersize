// Making web audio play through the iOS hardware silent switch in a standalone
// PWA is heavily restricted. Levers, used together:
//   1. navigator.audioSession.type = 'playback'  (iOS 16.4+, official API)
//   2. a looping near-silent clip that holds the audio channel open
//   3. re-priming both whenever the app returns to the foreground (standalone
//      PWAs get their audio session torn down on background)
// All best-effort; degrade silently where unsupported.

type AudioSessionLike = { type: string }

function getAudioSession(): AudioSessionLike | undefined {
  return (navigator as unknown as { audioSession?: AudioSessionLike }).audioSession
}

// Mark the page's audio as "playback" so it isn't silenced by the mute switch.
// Safe to call at startup and again on a user gesture.
export function primeAudioSession() {
  try {
    const s = getAudioSession()
    if (s) s.type = 'playback'
  } catch {
    /* unsupported — ignore */
  }
}

// Release the "playback" grab so other apps' background audio (music) can play.
// 'ambient' mixes with other audio and obeys the mute switch — appropriate for
// screens that make no sound. Called when leaving the sound-enabled (Kegel) page.
export function releaseAudioSession() {
  try {
    const s = getAudioSession()
    if (s) s.type = 'ambient'
  } catch {
    /* unsupported — ignore */
  }
}

export function audioSessionInfo(): { supported: boolean; type: string | null } {
  try {
    const s = getAudioSession()
    return { supported: !!s, type: s?.type ?? null }
  } catch {
    return { supported: false, type: null }
  }
}

let keepAlive: HTMLAudioElement | null = null

// Hold the audio channel open with a looping silent clip (10 s — long enough
// that loop restarts don't release the session). Combined with the playback
// session, this nudges iOS into routing audio to the speaker even when the
// silent switch is on. Must be started from a user gesture (e.g. Start tap).
export function startSilentKeepAlive() {
  try {
    if (!keepAlive) {
      keepAlive = new Audio('/silence-10s.wav')
      keepAlive.loop = true
      keepAlive.preload = 'auto'
      keepAlive.volume = 1 // digital-silence samples — inaudible, but a real media signal
      keepAlive.setAttribute('playsinline', '')
      keepAlive.style.display = 'none'
      document.body.appendChild(keepAlive)
    }
    if (keepAlive.paused) void keepAlive.play().catch(() => {})
  } catch {
    /* ignore */
  }
}

// Pause the keep-alive loop so it stops holding the audio channel open. The
// element is kept in the DOM so a later startSilentKeepAlive() can resume it.
export function stopSilentKeepAlive() {
  try {
    if (keepAlive && !keepAlive.paused) keepAlive.pause()
  } catch {
    /* ignore */
  }
}

export function keepAliveState(): { exists: boolean; playing: boolean; currentTime: number } {
  return {
    exists: keepAlive !== null,
    playing: keepAlive !== null && !keepAlive.paused,
    currentTime: keepAlive?.currentTime ?? 0,
  }
}

// Whether a user gesture has already unlocked audio this app-run (i.e. the
// keep-alive was started). Foreground re-priming only restarts it in that case.
function unlocked(): boolean {
  return keepAlive !== null
}

// Scoped to the sound-enabled (Kegel) screen — NOT the whole app. Primes the
// session immediately and re-primes it + restarts the keep-alive whenever the
// app returns to the foreground (iOS standalone PWAs tear the audio session down
// on background; without this the first cue after returning is silent/delayed).
// Returns a cleanup that removes the listeners, stops the keep-alive, and
// releases the "playback" session so background music can resume on other pages.
export function initAudioLifecycle(): () => void {
  primeAudioSession()
  const onForeground = () => {
    if (document.visibilityState !== 'visible') return
    primeAudioSession()
    if (unlocked()) startSilentKeepAlive()
  }
  document.addEventListener('visibilitychange', onForeground)
  window.addEventListener('pageshow', onForeground)
  window.addEventListener('focus', onForeground)
  return () => {
    document.removeEventListener('visibilitychange', onForeground)
    window.removeEventListener('pageshow', onForeground)
    window.removeEventListener('focus', onForeground)
    stopSilentKeepAlive()
    releaseAudioSession()
  }
}
