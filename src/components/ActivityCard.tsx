import { Check } from 'lucide-react'

interface ActivityCardProps {
  icon: string
  label: string
  subtitle: string
  done: boolean
  onStart: () => void
}

export default function ActivityCard({ icon, label, subtitle, done, onStart }: ActivityCardProps) {
  return (
    <div className="bg-surface rounded-xl border border-border px-4 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="font-semibold text-text">{label}</p>
          <p className="text-text-dim text-sm">{subtitle}</p>
        </div>
      </div>
      {done ? (
        <Check size={24} className="text-green" />
      ) : (
        <button
          onClick={onStart}
          className="bg-primary text-white font-bold text-sm rounded-lg px-4 py-2 active:scale-95 transition-transform"
        >
          Start
        </button>
      )}
    </div>
  )
}
