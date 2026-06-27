import { useCallback } from 'react'
import type { Profile } from '../lib/types'
import { nextTarget, prevTarget } from '../lib/levels'

const today = () => new Date().toISOString().split('T')[0]

// Shared level up/down actions. Re-stamps weekStartDate so the consistency
// counter restarts at the new level.
export function useLeveling(
  profile: Profile | null,
  updateProfile: (data: Partial<Profile>) => Promise<void>
) {
  const levelUp = useCallback(async () => {
    if (!profile) return
    const nt = nextTarget(profile.currentTarget)
    if (nt === null) return
    await updateProfile({
      currentTarget: nt,
      currentWeek: profile.currentWeek + 1,
      weekStartDate: today(),
    })
  }, [profile, updateProfile])

  const levelDown = useCallback(async () => {
    if (!profile) return
    const pt = prevTarget(profile.currentTarget)
    if (pt === null) return
    await updateProfile({ currentTarget: pt, weekStartDate: today() })
  }, [profile, updateProfile])

  return { levelUp, levelDown }
}
