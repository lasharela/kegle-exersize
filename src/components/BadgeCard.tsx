import {
  Footprints, Dumbbell, Flame, Zap, Crown, Sunrise, Moon,
  Calendar, Trophy, Mountain, Shield, Award, Star,
  type LucideProps,
} from 'lucide-react'
import type { ForwardRefExoticComponent, RefAttributes } from 'react'

type IconComponent = ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>>

const ICON_MAP: Record<string, IconComponent> = {
  Footprints, Dumbbell, Flame, Zap, Crown, Sunrise, Moon,
  Calendar, Trophy, Mountain, Shield, Award, Star,
}

interface Props {
  icon: string
  name: string
  description: string
  unlocked: boolean
}

export default function BadgeCard({ icon, name, description, unlocked }: Props) {
  const Icon = ICON_MAP[icon] ?? Star

  return (
    <div className={`bg-surface rounded-xl p-3 flex items-center gap-3 ${unlocked ? '' : 'opacity-40'}`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${unlocked ? 'bg-yellow/15' : 'bg-surface-2'}`}>
        <Icon size={20} className={unlocked ? 'text-yellow' : 'text-text-dim'} />
      </div>
      <div className="min-w-0">
        <p className={`font-semibold text-sm ${unlocked ? 'text-yellow' : 'text-text-dim'}`}>{name}</p>
        <p className="text-text-dim text-xs truncate">{description}</p>
      </div>
    </div>
  )
}
