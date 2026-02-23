interface Props {
  icon: string
  name: string
  description: string
  unlocked: boolean
}

export default function BadgeCard({ icon, name, description, unlocked }: Props) {
  return (
    <div className={`bg-surface rounded-xl p-3 flex items-center gap-3 ${unlocked ? '' : 'opacity-40'}`}>
      <span className="text-2xl">{icon}</span>
      <div className="min-w-0">
        <p className={`font-semibold text-sm ${unlocked ? 'text-yellow' : 'text-text-dim'}`}>{name}</p>
        <p className="text-text-dim text-xs truncate">{description}</p>
      </div>
    </div>
  )
}
