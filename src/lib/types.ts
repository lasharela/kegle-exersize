export interface Profile {
  $id: string
  userId: string
  initials: string
  totalPoints: number
  shieldsOwned: number
  shieldsUsed: string[]
  currentWeek: number
  currentTarget: number
  pulseInterval: number
  reminderTime: string
  notificationsEnabled: boolean
  unlockedBadges: string[]
  weekStartDate: string
  totalPulses: number
}

export interface Exercise {
  $id: string
  userId: string
  date: string
  completed: boolean
  pulsesCompleted: number
  targetPulses: number
  pointsEarned: number
  startTime: string
  endTime?: string
  shieldUsed: boolean
}

export type ExercisePhase =
  | 'idle'
  | 'countdown'
  | 'warmupA_hold'
  | 'warmupA_rest'
  | 'breakA'
  | 'warmupB_hold'
  | 'warmupB_rest'
  | 'breakB'
  | 'pulse_tick'
  | 'pulse_break'
  | 'completed'

export interface ExerciseState {
  phase: ExercisePhase
  timeRemaining: number
  warmupARep: number
  warmupBRep: number
  pulsesCompleted: number
  targetPulses: number
  pulseInterval: number
  totalWarmupAReps: number
  totalWarmupBReps: number
  isPaused: boolean
}

export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  evaluate: (profile: Profile, exercises: Exercise[]) => boolean
}
