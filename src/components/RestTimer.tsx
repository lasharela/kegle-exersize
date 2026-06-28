interface Props {
  remaining: number
  onSkip: () => void
  onAdd: () => void
}

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function RestTimer({ remaining, onSkip, onAdd }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 flex-1 py-8">
      <p className="text-text-dim text-sm uppercase tracking-widest">Rest</p>
      <p className="text-text font-bold text-8xl tabular-nums">{fmt(remaining)}</p>
      <div className="flex gap-3 w-full px-4">
        <button
          onClick={onSkip}
          className="flex-1 bg-surface border border-border text-text font-semibold rounded-full py-3 active:scale-95 transition-transform"
        >
          Skip
        </button>
        <button
          onClick={onAdd}
          className="flex-1 bg-surface border border-yellow/40 text-yellow font-semibold rounded-full py-3 active:scale-95 transition-transform"
        >
          +15s
        </button>
      </div>
    </div>
  )
}
