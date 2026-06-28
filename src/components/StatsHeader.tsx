interface StatsHeaderProps {
  streak: number
  runsThisWeek: number
  strengthThisWeek: number
}

export default function StatsHeader({ streak, runsThisWeek, strengthThisWeek }: StatsHeaderProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-surface rounded-xl border border-border px-3 py-3 flex flex-col items-center">
        <span className="text-lg">🔥 {streak}</span>
        <span className="text-xs text-text-dim mt-1">streak</span>
      </div>
      <div className="bg-surface rounded-xl border border-border px-3 py-3 flex flex-col items-center">
        <span className="text-lg">🏃 {runsThisWeek}/wk</span>
        <span className="text-xs text-text-dim mt-1">runs</span>
      </div>
      <div className="bg-surface rounded-xl border border-border px-3 py-3 flex flex-col items-center">
        <span className="text-lg">🏋️ {strengthThisWeek}/wk</span>
        <span className="text-xs text-text-dim mt-1">strength</span>
      </div>
    </div>
  )
}
