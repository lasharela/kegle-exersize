import { useNavigate } from 'react-router-dom'
import { activitiesForDate } from '../lib/schedule'
import type { ActivityType } from '../lib/program'

function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

const ACTIVITY_META: Record<ActivityType, { label: string; route: string; color: string }> = {
  kegel:    { label: 'Kegel',    route: '/kegel',    color: 'text-primary' },
  warmup:   { label: 'Warm-up',  route: '/warmup',   color: 'text-yellow' },
  strength: { label: 'Strength', route: '/strength', color: 'text-blue' },
  run:      { label: 'Running',  route: '/run',      color: 'text-green' },
}

export default function Dashboard() {
  const navigate = useNavigate()
  const today = todayISO()
  const activities = activitiesForDate(today)

  return (
    <div className="flex flex-col flex-1 px-4 py-6 gap-4 overflow-y-auto">
      <h1 className="text-text font-bold text-2xl">Today</h1>

      {activities.length === 0 && (
        <p className="text-text-dim text-sm">Rest day — nothing scheduled.</p>
      )}

      {activities.map((activity) => {
        const meta = ACTIVITY_META[activity]
        return (
          <div
            key={activity}
            className="flex items-center justify-between bg-surface rounded-xl px-4 py-4 border border-border"
          >
            <span className={`font-semibold text-base ${meta.color}`}>{meta.label}</span>
            <button
              onClick={() => navigate(meta.route)}
              className="bg-primary text-white text-sm font-bold px-4 py-2 rounded-lg active:scale-95 transition-transform"
            >
              Start
            </button>
          </div>
        )
      })}
    </div>
  )
}
