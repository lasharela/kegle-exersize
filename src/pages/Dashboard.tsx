import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Query } from 'appwrite'
import { useAuth } from '../context/AuthContext'
import { activitiesForDate, weekStartISO, weeklyProgress } from '../lib/schedule'
import { listActivityLogs } from '../lib/activity-log'
import { parseTrainingState } from '../lib/training-state'
import { levelNumber } from '../lib/levels'
import { databases, DATABASE_ID, EXERCISES_COLLECTION } from '../lib/appwrite'
import type { ActivityType } from '../lib/program'
import { STRENGTH_CIRCUIT } from '../lib/program'
import { localDateISO } from '../lib/date'
import type { ActivityLog, Exercise } from '../lib/types'
import StatsHeader from '../components/StatsHeader'
import ActivityCard from '../components/ActivityCard'
import RingerHint from '../components/RingerHint'

type ActivityMeta = { icon: string; label: string; subtitle: string; route: string }

const ACTIVITY_ICON: Record<ActivityType, string> = { kegel: '🩺', warmup: '🔥', strength: '🏋️', run: '🏃' }
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const ALL_TYPES: ActivityType[] = ['kegel', 'warmup', 'strength', 'run']

export default function Dashboard() {
  const navigate = useNavigate()
  const { profile, streakDays } = useAuth()

  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [kegelDates, setKegelDates] = useState<Set<string>>(new Set())

  const today = localDateISO()

  useEffect(() => {
    if (!profile?.userId) return

    const userId = profile.userId

    Promise.allSettled([
      listActivityLogs(userId),
      databases.listDocuments(DATABASE_ID, EXERCISES_COLLECTION, [
        Query.equal('userId', userId),
        Query.orderDesc('date'),
        Query.limit(100),
      ]),
    ]).then(([logsResult, exercisesResult]) => {
      if (logsResult.status === 'fulfilled') {
        setLogs(logsResult.value)
      }
      if (exercisesResult.status === 'fulfilled') {
        const docs = exercisesResult.value.documents as unknown as Exercise[]
        setKegelDates(new Set(docs.filter(e => e.completed).map(e => e.date)))
      }
    })
  }, [profile?.userId])

  if (!profile) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-text-dim">Loading…</p>
      </div>
    )
  }

  const todayActivities = activitiesForDate(today)
  const weekStart = weekStartISO(today)
  const inWeek = (dateStr: string) => dateStr >= weekStart && dateStr <= today

  // The 7 dates of the current week (Mon..Sun) for the weekly plan strip.
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart + 'T00:00:00')
    d.setDate(d.getDate() + i)
    return localDateISO(d)
  })

  const runsThisWeek = new Set(
    logs.filter(l => l.type === 'run' && l.completed && inWeek(l.date)).map(l => l.date)
  ).size

  const strengthThisWeek = new Set(
    logs.filter(l => l.type === 'strength' && l.completed && inWeek(l.date)).map(l => l.date)
  ).size

  const progress = weeklyProgress({ logs, kegelDates: [...kegelDates], weekStart, today })

  const isDoneToday = (type: ActivityType): boolean => {
    if (type === 'kegel') return kegelDates.has(today)
    return logs.some(l => l.type === type && l.completed && l.date === today)
  }

  const getActivityMeta = (type: ActivityType): ActivityMeta => {
    const ts = parseTrainingState(profile, today)
    switch (type) {
      case 'kegel':    return { icon: '🩺', label: 'Kegel',    subtitle: `Level ${levelNumber(profile.currentTarget)} · ${profile.currentTarget} pulses`, route: '/kegel' }
      case 'warmup':   return { icon: '🔥', label: 'Warm-up',  subtitle: '~4 min · band + body',                                                          route: '/warmup' }
      case 'strength': return { icon: '🏋️', label: 'Strength', subtitle: `${STRENGTH_CIRCUIT.length} moves · ~25 min`,                                      route: '/strength' }
      case 'run':      return { icon: '🏃', label: 'Running',  subtitle: `${ts.runMinutes} min · easy`,                                                    route: '/run' }
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
      <RingerHint />
      <StatsHeader streak={streakDays} runsThisWeek={runsThisWeek} strengthThisWeek={strengthThisWeek} />

      {/* TODAY section — all activities always shown; today's are highlighted, the
          rest are dimmed "optional" so you can always do extra. */}
      <div>
        <h2 className="font-semibold text-text mb-3">TODAY</h2>
        <div className="space-y-3">
          {[...ALL_TYPES]
            .sort((a, b) => Number(todayActivities.includes(b)) - Number(todayActivities.includes(a)))
            .map(type => {
              const meta = getActivityMeta(type)
              return (
                <ActivityCard
                  key={type}
                  icon={meta.icon}
                  label={meta.label}
                  subtitle={meta.subtitle}
                  scheduled={todayActivities.includes(type)}
                  done={isDoneToday(type)}
                  onStart={() => navigate(meta.route)}
                />
              )
            })}
        </div>
      </div>

      {/* THIS WEEK section */}
      <div>
        <h2 className="font-semibold text-text mb-3">THIS WEEK</h2>
        <div className="bg-surface rounded-xl border border-border p-4 space-y-4">
          {/* Weekly plan strip — workouts per day (Kegel is daily, shown in Today) */}
          <div className="flex justify-between gap-1">
            {weekDates.map((date, i) => {
              const workouts = activitiesForDate(date).filter(a => a !== 'kegel')
              const isToday = date === today
              return (
                <div
                  key={date}
                  className={`flex-1 flex flex-col items-center gap-1 rounded-lg py-2 ${isToday ? 'bg-primary/15 border border-primary/40' : ''}`}
                >
                  <span className={`text-[11px] font-semibold ${isToday ? 'text-primary' : 'text-text-dim'}`}>{DAY_LABELS[i]}</span>
                  <div className="flex flex-col items-center gap-0.5 min-h-[18px]">
                    {workouts.length === 0
                      ? <span className="text-text-dim text-xs">·</span>
                      : workouts.map(a => <span key={a} className="text-sm leading-none">{ACTIVITY_ICON[a]}</span>)}
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-text-dim text-[11px] text-center">🩺 Kegel every day · 🏃 run Mon/Wed/Fri · 🏋️ strength Tue/Thu/Sat</p>

          {/* Progress */}
          <div>
            <div className="flex justify-between items-center text-sm mb-2">
              <span className="text-text-dim">Progress</span>
              <span className="text-text font-semibold">{progress.done}/{progress.total}</span>
            </div>
            <div className="h-3 bg-bg rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
