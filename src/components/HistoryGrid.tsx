import type { Exercise } from '../lib/types'

interface Props {
  exercises: Exercise[]
}

export default function HistoryGrid({ exercises }: Props) {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  // Build 30 days of history
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (29 - i))
    const date = d.toISOString().split('T')[0]
    const exercise = exercises.find((e) => e.date === date)
    const isToday = date === todayStr
    const isFuture = date > todayStr

    let status: 'done' | 'missed' | 'today' | 'future' | 'shield' | 'empty' = 'empty'
    if (isFuture) status = 'future'
    else if (exercise?.completed) status = 'done'
    else if (exercise?.shieldUsed) status = 'shield'
    else if (isToday) status = 'today'
    else if (date < todayStr) status = 'missed'

    return { date, status, day: d.getDate() }
  })

  const completedCount = days.filter((d) => d.status === 'done').length

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-text-dim text-xs">{completedCount} / 30 days</span>
        <div className="flex items-center gap-2 text-text-dim text-xs">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green inline-block" /> done</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-primary/40 inline-block" /> missed</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue inline-block" /> shield</span>
        </div>
      </div>
      <div className="grid grid-cols-10 gap-1">
        {days.map((d) => (
          <div
            key={d.date}
            title={d.date}
            className={`aspect-square rounded-sm ${
              d.status === 'done' ? 'bg-green' :
              d.status === 'shield' ? 'bg-blue' :
              d.status === 'today' ? 'ring-1 ring-primary bg-surface-2' :
              d.status === 'missed' ? 'bg-primary/30' :
              'bg-surface-2'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
