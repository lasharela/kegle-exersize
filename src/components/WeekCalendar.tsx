import { Check, X, Shield, Minus } from 'lucide-react'
import type { Exercise } from '../lib/types'

interface Props {
  exercises: Exercise[]
  weekStartDate: string
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function WeekCalendar({ exercises, weekStartDate }: Props) {
  const start = new Date(weekStartDate)
  const today = new Date().toISOString().split('T')[0]

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    const date = d.toISOString().split('T')[0]
    const exercise = exercises.find((e) => e.date === date)
    const isToday = date === today
    const isFuture = date > today

    let status: 'done' | 'missed' | 'today' | 'future' | 'shield' = 'future'
    if (exercise?.completed) status = 'done'
    else if (exercise?.shieldUsed) status = 'shield'
    else if (isToday) status = 'today'
    else if (!isFuture && !exercise) status = 'missed'

    return { day: DAYS[i], date, status }
  })

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((d) => (
        <div key={d.date} className="flex flex-col items-center gap-1">
          <span className="text-text-dim text-xs">{d.day}</span>
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center ${
              d.status === 'done' ? 'bg-green text-white' :
              d.status === 'shield' ? 'bg-blue text-white' :
              d.status === 'today' ? 'border-2 border-primary text-primary' :
              d.status === 'missed' ? 'bg-primary/20 text-primary' :
              'bg-surface-2 text-text-dim'
            }`}
          >
            {d.status === 'done' ? <Check size={16} /> :
             d.status === 'shield' ? <Shield size={14} /> :
             d.status === 'missed' ? <X size={14} /> :
             d.status === 'today' ? <Minus size={14} /> : null}
          </div>
        </div>
      ))}
    </div>
  )
}
