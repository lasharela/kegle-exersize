// Installs the navigator.vibrate polyfill on iOS Safari/PWA (side-effect import).
// On iOS the underlying audio trick also emits a subtle click, so each pulse is
// both tactile and audible from one well-tested library.
import 'ios-vibrator-pro-max'
import { hapticsEnabled } from './settings'

export function haptic(pattern: number | number[]) {
  if (!hapticsEnabled()) return
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* vibrate unsupported — silently ignore */
  }
}

// Short tap for each fast pulse.
export const pulseTap = () => haptic(15)
// Squeeze / hold start.
export const squeezeBuzz = () => haptic(45)
// Release.
export const releaseBuzz = () => haptic([20, 30, 20])
// Entering a rest break.
export const breakBuzz = () => haptic(80)
// Session complete celebration.
export const completeCelebrate = () => haptic([80, 60, 80, 60, 160])
