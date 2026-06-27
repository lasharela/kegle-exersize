// Making web audio play through the iOS hardware silent switch in a standalone
// PWA is heavily restricted. Two levers, used together:
//   1. navigator.audioSession.type = 'playback'  (iOS 16.4+, official API)
//   2. a looping near-silent clip that holds the audio channel open
// Both are best-effort and degrade silently where unsupported.

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

let keepAlive: HTMLAudioElement | null = null

// Hold the audio channel open with a looping near-silent clip. Combined with the
// playback session, this nudges iOS into routing audio to the speaker even when
// the silent switch is on. Must be started from a user gesture (e.g. Start tap).
export function startSilentKeepAlive() {
  try {
    if (!keepAlive) {
      keepAlive = new Audio('/silence.wav')
      keepAlive.loop = true
      keepAlive.preload = 'auto'
      keepAlive.volume = 0.001 // inaudible, but a real signal keeps the session live
    }
    if (keepAlive.paused) void keepAlive.play().catch(() => {})
  } catch {
    /* ignore */
  }
}
