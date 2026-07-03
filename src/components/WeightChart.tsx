import { useMemo, useRef, useState } from 'react'
import { movingAverage } from '../lib/weight-log'
import { WEIGHT } from '../lib/program'

interface Props {
  // Date-ascending daily entries.
  entries: { date: string; kg: number }[]
}

const W = 340
const H = 200
const PAD = { top: 12, right: 12, bottom: 22, left: 34 }

export default function WeightChart({ entries }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [inspect, setInspect] = useState<number | null>(null)

  const avg = useMemo(() => movingAverage(entries), [entries])

  if (entries.length === 0) {
    return <p className="text-text-dim text-sm text-center py-8">Log your first weight to see the trend.</p>
  }

  const kgs = entries.map((e) => e.kg)
  const yMin = Math.min(...kgs, WEIGHT.goalKg) - 1
  const yMax = Math.max(...kgs, WEIGHT.goalKg) + 1

  const x = (i: number) =>
    entries.length === 1
      ? (PAD.left + W - PAD.right) / 2
      : PAD.left + (i / (entries.length - 1)) * (W - PAD.left - PAD.right)
  const y = (kg: number) => PAD.top + ((yMax - kg) / (yMax - yMin)) * (H - PAD.top - PAD.bottom)

  const avgPath = avg.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.kg).toFixed(1)}`).join(' ')

  // Recessive horizontal grid on whole kg (at most ~5 lines).
  const gridStep = Math.max(1, Math.ceil((yMax - yMin) / 5))
  const gridLines: number[] = []
  for (let v = Math.ceil(yMin); v <= Math.floor(yMax); v += gridStep) gridLines.push(v)

  const fmtDate = (iso: string) =>
    new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const handlePointer = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const px = ((e.clientX - rect.left) / rect.width) * W
    let best = 0
    let bestDist = Infinity
    entries.forEach((_, i) => {
      const d = Math.abs(x(i) - px)
      if (d < bestDist) { bestDist = d; best = i }
    })
    setInspect(best)
  }

  const sel = inspect !== null ? entries[inspect] : null

  return (
    <div>
      {/* Readout line (tap/drag on the chart) */}
      <p className="text-xs text-text-dim h-4 mb-1">
        {sel
          ? <>{fmtDate(sel.date)}: <span className="text-text font-semibold">{sel.kg.toFixed(1)} kg</span> · 7-day avg {avg[inspect!].kg.toFixed(1)}</>
          : 'Tap the chart to inspect a day'}
      </p>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none select-none"
        onPointerDown={handlePointer}
        onPointerMove={(e) => e.buttons > 0 && handlePointer(e)}
      >
        {/* Grid + y labels */}
        {gridLines.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="var(--color-border)" strokeWidth={0.5} />
            <text x={PAD.left - 6} y={y(v) + 3} textAnchor="end" fontSize={9} fill="var(--color-text-dim)">{v}</text>
          </g>
        ))}

        {/* Goal reference line (dashed) with direct label */}
        <line
          x1={PAD.left} x2={W - PAD.right} y1={y(WEIGHT.goalKg)} y2={y(WEIGHT.goalKg)}
          stroke="var(--color-green)" strokeWidth={1} strokeDasharray="4 4" opacity={0.8}
        />
        <text x={W - PAD.right} y={y(WEIGHT.goalKg) - 4} textAnchor="end" fontSize={9} fill="var(--color-text-dim)">
          goal {WEIGHT.goalKg}
        </text>

        {/* Raw daily readings — small muted dots */}
        {entries.map((e, i) => (
          <circle key={e.date} cx={x(i)} cy={y(e.kg)} r={2.5} fill="var(--color-text-dim)" opacity={0.7} />
        ))}

        {/* 7-day trend line */}
        {entries.length > 1 && (
          <path d={avgPath} fill="none" stroke="var(--color-blue)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        )}

        {/* Inspect crosshair */}
        {inspect !== null && (
          <g>
            <line x1={x(inspect)} x2={x(inspect)} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--color-text-dim)" strokeWidth={0.5} />
            <circle cx={x(inspect)} cy={y(entries[inspect].kg)} r={4} fill="var(--color-blue)" stroke="var(--color-surface)" strokeWidth={2} />
          </g>
        )}

        {/* X labels: first + last date */}
        <text x={PAD.left} y={H - 6} fontSize={9} fill="var(--color-text-dim)">{fmtDate(entries[0].date)}</text>
        <text x={W - PAD.right} y={H - 6} textAnchor="end" fontSize={9} fill="var(--color-text-dim)">
          {fmtDate(entries[entries.length - 1].date)}
        </text>
      </svg>

      {/* Legend */}
      <div className="flex gap-4 mt-2 text-xs text-text-dim">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-text-dim opacity-70" /> daily
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-0.5 bg-blue" /> 7-day trend
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 border-t border-dashed border-green" /> goal
        </span>
      </div>
    </div>
  )
}
