import { Check } from 'lucide-react'

interface ActivityCardProps {
  icon: string
  label: string
  subtitle: string
  scheduled: boolean // is this on today's plan?
  done: boolean
  onStart: () => void
}

export default function ActivityCard({ icon, label, subtitle, scheduled, done, onStart }: ActivityCardProps) {
  const optional = !scheduled && !done

  const containerClass = done
    ? 'bg-surface border-green/30'
    : scheduled
      ? 'bg-surface border-primary/40'
      : 'bg-surface/50 border-border opacity-60'

  return (
    <div className={`rounded-xl border px-4 py-4 flex items-center justify-between transition-colors ${containerClass}`}>
      <div className="flex items-center gap-3">
        <span className={`text-2xl ${optional ? 'grayscale' : ''}`}>{icon}</span>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-text">{label}</p>
            {scheduled && !done && (
              <span className="text-[10px] font-bold text-primary bg-primary/15 rounded px-1.5 py-0.5">TODAY</span>
            )}
            {optional && (
              <span className="text-[10px] font-semibold text-text-dim bg-bg rounded px-1.5 py-0.5">optional</span>
            )}
          </div>
          <p className="text-text-dim text-sm">{subtitle}</p>
        </div>
      </div>
      {done ? (
        <Check size={24} className="text-green" />
      ) : scheduled ? (
        <button
          onClick={onStart}
          className="bg-primary text-white font-bold text-sm rounded-lg px-4 py-2 active:scale-95 transition-transform"
        >
          Start
        </button>
      ) : (
        <button
          onClick={onStart}
          className="border border-border text-text-dim font-semibold text-sm rounded-lg px-4 py-2 active:scale-95 transition-transform"
        >
          Start
        </button>
      )}
    </div>
  )
}
