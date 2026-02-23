import { useState, useEffect } from 'react'
import { Query } from 'appwrite'
import { useAuth } from '../context/AuthContext'
import { databases, DATABASE_ID, EXERCISES_COLLECTION } from '../lib/appwrite'
import { BADGES, evaluateBadges } from '../lib/badges'
import type { Exercise } from '../lib/types'
import WeekCalendar from '../components/WeekCalendar'
import BadgeCard from '../components/BadgeCard'

export default function Settings() {
  const { profile, updateProfile, logout } = useAuth()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [pulseInterval, setPulseInterval] = useState(profile?.pulseInterval ?? 1.5)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!profile) return
    databases
      .listDocuments(DATABASE_ID, EXERCISES_COLLECTION, [
        Query.equal('userId', profile.userId),
        Query.orderDesc('date'),
        Query.limit(100),
      ])
      .then((res) => {
        const docs = res.documents as unknown as Exercise[]
        setExercises(docs)
        checkBadges(docs)
      })
      .catch(console.error)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.userId])

  const checkBadges = async (exs: Exercise[]) => {
    if (!profile) return
    const newBadges = evaluateBadges(profile, exs)
    if (newBadges.length > 0) {
      await updateProfile({
        unlockedBadges: [...profile.unlockedBadges, ...newBadges],
      })
    }
  }

  const handleSaveInterval = async () => {
    setSaving(true)
    await updateProfile({ pulseInterval })
    setSaving(false)
  }

  const handleBuyShield = async () => {
    if (!profile || profile.totalPoints < 25 || profile.shieldsOwned >= 2) return
    await updateProfile({
      totalPoints: profile.totalPoints - 25,
      shieldsOwned: profile.shieldsOwned + 1,
    })
  }

  const handleWeekProgression = async () => {
    if (!profile) return
    const newTarget = Math.min(profile.currentTarget + 200, 2000)
    const today = new Date().toISOString().split('T')[0]
    await updateProfile({
      currentWeek: profile.currentWeek + 1,
      currentTarget: newTarget,
      weekStartDate: today,
    })
  }

  if (!profile) return null

  const weekStart = new Date(profile.weekStartDate)
  const now = new Date()
  const daysSinceStart = Math.floor((now.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24))
  const showProgression = daysSinceStart >= 7

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-green">{profile.totalPoints}</p>
          <p className="text-text-dim text-xs">Points</p>
        </div>
        <div className="bg-surface rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-primary">{profile.totalPulses}</p>
          <p className="text-text-dim text-xs">Total Pulses</p>
        </div>
        <div className="bg-surface rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-yellow">Week {profile.currentWeek}</p>
          <p className="text-text-dim text-xs">Target: {profile.currentTarget}</p>
        </div>
      </div>

      {/* Week Progression */}
      {showProgression && profile.currentTarget < 2000 && (
        <div className="bg-surface border border-yellow/30 rounded-xl p-4">
          <p className="font-semibold text-yellow mb-2">Week Complete!</p>
          <p className="text-text-dim text-sm mb-3">
            Ready to increase your target from {profile.currentTarget} to {Math.min(profile.currentTarget + 200, 2000)} pulses?
          </p>
          <button
            onClick={handleWeekProgression}
            className="bg-yellow text-bg font-semibold rounded-lg py-2 px-4 text-sm active:scale-95 transition-transform"
          >
            Increase Target
          </button>
        </div>
      )}

      {/* Weekly Calendar */}
      <div>
        <h2 className="font-semibold mb-3">This Week</h2>
        <div className="bg-surface rounded-xl p-4">
          <WeekCalendar exercises={exercises} weekStartDate={profile.weekStartDate} />
        </div>
      </div>

      {/* Shields */}
      <div>
        <h2 className="font-semibold mb-3">Shields</h2>
        <div className="bg-surface rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm">Owned: <span className="text-blue font-bold">{profile.shieldsOwned}</span> / 2</p>
              <p className="text-text-dim text-xs">Protects a missed day from breaking your streak</p>
            </div>
            <button
              onClick={handleBuyShield}
              disabled={profile.totalPoints < 25 || profile.shieldsOwned >= 2}
              className="bg-blue text-white font-semibold rounded-lg py-2 px-4 text-sm disabled:opacity-40 active:scale-95 transition-transform"
            >
              Buy (25 pts)
            </button>
          </div>
        </div>
      </div>

      {/* Pulse Interval */}
      <div>
        <h2 className="font-semibold mb-3">Pulse Interval</h2>
        <div className="bg-surface rounded-xl p-4">
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={0.5}
              max={3}
              step={0.1}
              value={pulseInterval}
              onChange={(e) => setPulseInterval(parseFloat(e.target.value))}
              className="flex-1 accent-primary"
            />
            <span className="text-text font-bold w-12 text-right">{pulseInterval.toFixed(1)}s</span>
          </div>
          {pulseInterval !== profile.pulseInterval && (
            <button
              onClick={handleSaveInterval}
              disabled={saving}
              className="bg-primary text-white font-semibold rounded-lg py-2 px-4 text-sm mt-3 active:scale-95 transition-transform"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
      </div>

      {/* Badges */}
      <div>
        <h2 className="font-semibold mb-3">Badges</h2>
        <div className="grid grid-cols-1 gap-2">
          {BADGES.map((badge) => (
            <BadgeCard
              key={badge.id}
              icon={badge.icon}
              name={badge.name}
              description={badge.description}
              unlocked={profile.unlockedBadges.includes(badge.id)}
            />
          ))}
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={logout}
        className="w-full bg-surface border border-border text-text-dim font-semibold rounded-lg py-3 active:scale-[0.98] transition-transform"
      >
        Log Out
      </button>

      <div className="h-8" />
    </div>
  )
}
