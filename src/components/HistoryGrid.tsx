import type { Exercise } from '../lib/types'

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface Props {
  exercises: Exercise[]
  registrationDate: string
}

export default function HistoryGrid({ exercises, registrationDate }: Props) {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (29 - i))
    const date = d.toISOString().split('T')[0]
    const exercise = exercises.find((e) => e.date === date)
    const isToday = date === todayStr
    const isFuture = date > todayStr
    const isBeforeRegistration = date < registrationDate

    let status: 'done' | 'missed' | 'today' | 'future' | 'shield' | 'inactive' = 'inactive'
    if (isFuture || isBeforeRegistration) status = 'inactive'
    else if (exercise?.completed) status = 'done'
    else if (exercise?.shieldUsed) status = 'shield'
    else if (isToday) status = 'today'
    else if (date < todayStr) status = 'missed'

    return {
      date,
      status,
      dayNum: d.getDate(),
      dayAbbr: DAY_ABBR[d.getDay()],
    }
  })

  const completedCount = days.filter((d) => d.status === 'done').length
  const activeDays = days.filter((d) => d.status !== 'inactive').length

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-text-dim text-xs">{completedCount} / {activeDays} days</span>
        <div className="flex items-center gap-2 text-text-dim text-xs">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green inline-block" /> done</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-primary/40 inline-block" /> missed</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue inline-block" /> shield</span>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => (
          <div
            key={d.date}
            title={d.date}
            className={`aspect-square rounded-sm flex flex-col items-center justify-center ${
              d.status === 'done' ? 'bg-green text-white' :
              d.status === 'shield' ? 'bg-blue text-white' :
              d.status === 'today' ? 'ring-1 ring-primary bg-surface-2 text-text' :
              d.status === 'missed' ? 'bg-primary/30 text-primary' :
              'bg-surface-2 text-text-dim/40'
            }`}
          >
            <span className="text-[10px] font-bold leading-none">{d.dayNum}</span>
            <span className="text-[7px] leading-none mt-0.5">{d.dayAbbr}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
