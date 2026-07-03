import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { logWeight, listWeights } from '../lib/weight-log'
import { WEIGHT } from '../lib/program'
import { localDateISO } from '../lib/date'
import type { WeightLog } from '../lib/types'
import WeightChart from '../components/WeightChart'

export default function Weight() {
  const { profile } = useAuth()
  const [weights, setWeights] = useState<WeightLog[]>([])
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const today = localDateISO()

  const refresh = useCallback(async (userId: string) => {
    const list = await listWeights(userId)
    setWeights(list)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!profile?.userId) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refresh sets state only after an await
    void refresh(profile.userId)
  }, [profile?.userId, refresh])

  if (!profile) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-text-dim">Loading…</p>
      </div>
    )
  }

  const todayEntry = weights.find((w) => w.date === today)
  const latest = weights[0] ?? null
  // Chart wants date-ascending, capped to the last ~90 entries.
  const chartEntries = [...weights].reverse().slice(-90).map((w) => ({ date: w.date, kg: w.kg }))

  const parsed = parseFloat(input.replace(',', '.'))
  const valid = !Number.isNaN(parsed) && parsed > 30 && parsed < 250

  const handleSave = async () => {
    if (!valid || saving) return
    setSaving(true)
    await logWeight(profile.userId, Math.round(parsed * 10) / 10)
    await refresh(profile.userId)
    setInput('')
    setSaving(false)
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
      <h1 className="text-text font-bold text-2xl">Weight</h1>

      {/* Headline: latest + goal delta */}
      {latest && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface rounded-xl border border-border px-3 py-3 flex flex-col items-center">
            <span className="text-2xl font-bold">{latest.kg.toFixed(1)}</span>
            <span className="text-xs text-text-dim mt-1">kg · {latest.date === today ? 'today' : latest.date}</span>
          </div>
          <div className="bg-surface rounded-xl border border-border px-3 py-3 flex flex-col items-center">
            <span className="text-2xl font-bold text-green">{(latest.kg - WEIGHT.goalKg).toFixed(1)}</span>
            <span className="text-xs text-text-dim mt-1">kg to goal ({WEIGHT.goalKg})</span>
          </div>
        </div>
      )}

      {/* Entry */}
      <div className="bg-surface rounded-xl border border-border p-4">
        <p className="text-sm font-semibold mb-2">{todayEntry ? `Today: ${todayEntry.kg.toFixed(1)} kg — update?` : "Log today's weight"}</p>
        <div className="flex gap-3">
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="30"
            max="250"
            placeholder={latest ? latest.kg.toFixed(1) : '100.0'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-bg border border-border rounded-xl px-4 py-3 text-text text-lg font-semibold focus:outline-none focus:border-primary"
          />
          <button
            onClick={handleSave}
            disabled={!valid || saving}
            className="bg-primary text-white font-bold rounded-xl px-6 disabled:opacity-40 active:scale-95 transition-transform"
          >
            {saving ? '…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Trend chart */}
      <div className="bg-surface rounded-xl border border-border p-4">
        {loading
          ? <p className="text-text-dim text-sm text-center py-8">Loading…</p>
          : <WeightChart entries={chartEntries} />}
      </div>

      {/* Recent entries (table view of the chart data) */}
      {weights.length > 0 && (
        <div className="bg-surface rounded-xl border border-border p-4">
          <p className="text-sm font-semibold mb-2">Recent</p>
          <div className="space-y-1.5">
            {weights.slice(0, 10).map((w) => (
              <div key={w.$id} className="flex justify-between text-sm">
                <span className="text-text-dim">{w.date}</span>
                <span className="font-semibold">{w.kg.toFixed(1)} kg</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
