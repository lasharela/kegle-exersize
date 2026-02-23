import type { Badge, Profile, Exercise } from './types'

export const BADGES: Badge[] = [
  {
    id: 'first_steps',
    name: 'First Steps',
    description: 'Complete your first exercise',
    icon: '👣',
    evaluate: (_p, exercises) => exercises.some((e) => e.completed),
  },
  {
    id: 'pulse_500',
    name: '500 Club',
    description: 'Complete 500 total pulses',
    icon: '💪',
    evaluate: (p) => p.totalPulses >= 500,
  },
  {
    id: 'pulse_1000',
    name: '1K Pulser',
    description: 'Complete 1,000 total pulses',
    icon: '🔥',
    evaluate: (p) => p.totalPulses >= 1000,
  },
  {
    id: 'pulse_1500',
    name: 'Power House',
    description: 'Complete 1,500 total pulses',
    icon: '⚡',
    evaluate: (p) => p.totalPulses >= 1500,
  },
  {
    id: 'pulse_2000',
    name: 'Legendary',
    description: 'Complete 2,000 total pulses',
    icon: '👑',
    evaluate: (p) => p.totalPulses >= 2000,
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Complete an exercise before 7 AM',
    icon: '🌅',
    evaluate: (_p, exercises) => exercises.some((e) => {
      const hour = new Date(e.startTime).getHours()
      return e.completed && hour < 7
    }),
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Complete an exercise after 11 PM',
    icon: '🦉',
    evaluate: (_p, exercises) => exercises.some((e) => {
      const hour = new Date(e.startTime).getHours()
      return e.completed && hour >= 23
    }),
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Complete 7 consecutive days',
    icon: '🗓️',
    evaluate: (_p, exercises) => hasStreak(exercises, 7),
  },
  {
    id: 'streak_30',
    name: 'Monthly Master',
    description: 'Complete 30 consecutive days',
    icon: '🏆',
    evaluate: (_p, exercises) => hasStreak(exercises, 30),
  },
  {
    id: 'peak_performance',
    name: 'Peak Performance',
    description: 'Reach the 2000 pulse target',
    icon: '🏔️',
    evaluate: (p) => p.currentTarget >= 2000,
  },
  {
    id: 'shield_buyer',
    name: 'Shield Bearer',
    description: 'Purchase your first shield',
    icon: '🛡️',
    evaluate: (p) => p.shieldsOwned > 0 || p.shieldsUsed.length > 0,
  },
  {
    id: 'points_100',
    name: 'Century',
    description: 'Earn 100 total points',
    icon: '💯',
    evaluate: (p) => p.totalPoints >= 100,
  },
]

function hasStreak(exercises: Exercise[], days: number): boolean {
  const completedDates = new Set(
    exercises.filter((e) => e.completed).map((e) => e.date)
  )
  if (completedDates.size < days) return false

  const sorted = Array.from(completedDates).sort()
  let streak = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1])
    const curr = new Date(sorted[i])
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
    if (diff === 1) {
      streak++
      if (streak >= days) return true
    } else {
      streak = 1
    }
  }
  return streak >= days
}

export function evaluateBadges(profile: Profile, exercises: Exercise[]): string[] {
  return BADGES
    .filter((b) => !profile.unlockedBadges.includes(b.id) && b.evaluate(profile, exercises))
    .map((b) => b.id)
}
