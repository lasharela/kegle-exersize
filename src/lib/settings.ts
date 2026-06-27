// Local-only user preferences (no Appwrite schema change needed).
// Read at call time so toggles take effect immediately.

function getFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) !== 'off'
  } catch {
    return true
  }
}

function setFlag(key: string, value: boolean) {
  try {
    localStorage.setItem(key, value ? 'on' : 'off')
  } catch {
    /* ignore storage failures */
  }
}

export const soundEnabled = () => getFlag('kegle.sound')
export const setSoundEnabled = (v: boolean) => setFlag('kegle.sound', v)

export const hapticsEnabled = () => getFlag('kegle.haptics')
export const setHapticsEnabled = (v: boolean) => setFlag('kegle.haptics', v)
