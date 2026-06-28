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
import type { ActivityLog, Exercise } from '../lib/types'
import StatsHeader from '../components/StatsHeader'
import ActivityCard from '../components/ActivityCard'

type ActivityMeta = { icon: string; label: string; subtitle: string; route: string }

export default function Dashboard() {
  const navigate = useNavigate()
  const { profile, streakDays } = useAuth()

  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [kegelDates, setKegelDates] = useState<Set<string>>(new Set())

  const d = new Date()
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

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
      case 'strength': return { icon: '🏋️', label: 'Strength', subtitle: '7 moves · ~25 min',                                                              route: '/strength' }
      case 'run':      return { icon: '🏃', label: 'Running',  subtitle: `${ts.runMinutes} min · easy`,                                                    route: '/run' }
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
      <StatsHeader streak={streakDays} runsThisWeek={runsThisWeek} strengthThisWeek={strengthThisWeek} />

      {/* TODAY section */}
      <div>
        <h2 className="font-semibold text-text mb-3">TODAY</h2>
        <div className="space-y-3">
          {todayActivities.length === 0 && (
            <p className="text-text-dim text-sm">Rest day — nothing scheduled.</p>
          )}
          {todayActivities.map(type => {
            const meta = getActivityMeta(type)
            return (
              <ActivityCard
                key={type}
                icon={meta.icon}
                label={meta.label}
                subtitle={meta.subtitle}
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
        <div className="bg-surface rounded-xl border border-border p-4">
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
  )
}
