import { describe, it, expect } from 'vitest'
import { defaultTrainingState, parseTrainingState, currentReps } from './training-state'
import type { Profile } from './types'

function profile(over: Partial<Profile> = {}): Profile {
  return { $id:'p', userId:'u', initials:'AB', totalPoints:0, shieldsOwned:0, shieldsUsed:[],
    currentWeek:1, currentTarget:100, pulseInterval:1.5, reminderTime:'09:00',
    notificationsEnabled:false, unlockedBadges:[], weekStartDate:'2026-06-01', totalPulses:0, ...over }
}

describe('defaultTrainingState', () => {
  it('seeds reps from program start values and run target 20', () => {
    const s = defaultTrainingState('2026-06-27')
    expect(s.strength.swing).toBe(15)
    expect(s.strength.pushup).toBe(5)
    expect(s.runMinutes).toBe(20)
    expect(s.levelStart.strength).toBe('2026-06-27')
    expect(s.levelStart.run).toBe('2026-06-27')
  })
})

describe('parseTrainingState', () => {
  it('returns defaults when trainingState is empty or invalid', () => {
    expect(parseTrainingState(profile({ trainingState: undefined }), '2026-06-27').strength.swing).toBe(15)
    expect(parseTrainingState(profile({ trainingState: 'not json' }), '2026-06-27').runMinutes).toBe(20)
  })
  it('merges missing exercise keys from program defaults', () => {
    const partial = JSON.stringify({ strength: { swing: 30 }, runMinutes: 26, levelStart: { strength:'2026-06-01', run:'2026-06-01' } })
    const s = parseTrainingState(profile({ trainingState: partial }), '2026-06-27')
    expect(s.strength.swing).toBe(30)   // kept
    expect(s.strength.pushup).toBe(5)   // merged from program default
    expect(s.runMinutes).toBe(26)
  })
})

describe('currentReps', () => {
  it('returns the per-exercise rep count', () => {
    const s = defaultTrainingState('2026-06-27')
    expect(currentReps(s, 'swing')).toBe(15)
  })
})
