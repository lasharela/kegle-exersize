import { useState, useEffect } from 'react'
import { Query } from 'appwrite'
import { Shield, ChevronDown, Minus, Plus, Volume2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useLeveling } from '../hooks/useLeveling'
import { databases, DATABASE_ID, EXERCISES_COLLECTION } from '../lib/appwrite'
import { BADGES, evaluateBadges } from '../lib/badges'
import { daysCompletedThisLevel, canLevelUp, DAYS_TO_LEVEL_UP, consistentSessions } from '../lib/progression'
import { levelNumber, nextTarget, prevTarget } from '../lib/levels'
import { soundEnabled, setSoundEnabled, hapticsEnabled, setHapticsEnabled } from '../lib/settings'
import { parseTrainingState } from '../lib/training-state'
import { STRENGTH_CIRCUIT, PROGRESSION, SHIELDS } from '../lib/program'
import { localDateISO } from '../lib/date'
import { unlockSoundEngine } from '../lib/sound-player'
import { listActivityLogs } from '../lib/activity-log'
import type { Exercise, ActivityLog } from '../lib/types'
import WeekCalendar from '../components/WeekCalendar'
import HistoryGrid from '../components/HistoryGrid'
import BadgeCard from '../components/BadgeCard'
import SoundDiagnostics from '../components/SoundDiagnostics'

export default function Settings() {
  const { profile, user, updateProfile, buyShield, logout } = useAuth()
  const { levelUp, levelDown } = useLeveling(profile, updateProfile)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [pulseInterval, setPulseInterval] = useState(profile?.pulseInterval ?? 1.5)
  const [saving, setSaving] = useState(false)
  const [loadingExercises, setLoadingExercises] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const [sound, setSound] = useState(soundEnabled())
  const [haptics, setHaptics] = useState(hapticsEnabled())
  const [soundTest, setSoundTest] = useState<'idle' | 'testing' | 'accepted' | 'blocked'>('idle')

  const toggleSound = () => { const v = !sound; setSound(v); setSoundEnabled(v) }
  const toggleHaptics = () => { const v = !haptics; setHaptics(v); setHapticsEnabled(v) }

  const handleTestSound = async () => {
    if (!sound) {
      setSound(true)
      setSoundEnabled(true)
    }
    setSoundTest('testing')
    const accepted = await unlockSoundEngine('complete')
    setSoundTest(accepted ? 'accepted' : 'blocked')
  }

  useEffect(() => {
    if (!profile) return
    setPulseInterval(profile.pulseInterval)
    setLoadingExercises(true)
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
      .finally(() => setLoadingExercises(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.userId])

  useEffect(() => {
    if (!profile?.userId) return
    listActivityLogs(profile.userId).then(setActivityLogs).catch(console.error)
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


  if (!profile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <p className="text-text-dim mb-4">Profile not loaded</p>
        <p className="text-text-dim text-sm mb-6">Try logging out and registering a new account.</p>
        <button
          onClick={logout}
          className="bg-surface border border-border text-text-dim font-semibold rounded-lg py-3 px-6 active:scale-[0.98] transition-transform"
        >
          Log Out
        </button>
      </div>
    )
  }

  const today = localDateISO()

  const level = levelNumber(profile.currentTarget)
  const up = nextTarget(profile.currentTarget)
  const down = prevTarget(profile.currentTarget)
  const daysDone = daysCompletedThisLevel(exercises, profile)
  const canUp = canLevelUp(exercises, profile)

  const trainingState = parseTrainingState(profile, today)
  const strengthSessions = Math.min(consistentSessions(activityLogs, { type: 'strength', sinceISO: trainingState.levelStart.strength }), PROGRESSION.sessionsToRamp)
  const runSessions = Math.min(consistentSessions(activityLogs, { type: 'run', sinceISO: trainingState.levelStart.run }), PROGRESSION.sessionsToRamp)

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
          <p className="text-xl font-bold text-yellow">Lvl {level}</p>
          <p className="text-text-dim text-xs">Target: {profile.currentTarget}</p>
        </div>
      </div>

      {/* Level */}
      <div className="bg-surface rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">Level {level}</p>
            <p className="text-text-dim text-xs">{profile.currentTarget} pulses target</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={levelDown}
              disabled={down === null}
              aria-label="Decrease level"
              className="w-10 h-10 rounded-full bg-bg border border-border flex items-center justify-center disabled:opacity-30 active:scale-95 transition-transform"
            >
              <Minus size={18} />
            </button>
            <button
              onClick={levelUp}
              disabled={up === null}
              aria-label="Increase level"
              className="w-10 h-10 rounded-full bg-bg border border-border flex items-center justify-center disabled:opacity-30 active:scale-95 transition-transform"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        {up !== null ? (
          <div>
            <div className="flex justify-between text-xs text-text-dim mb-1">
              <span>Consistent days this level</span>
              <span>{Math.min(daysDone, DAYS_TO_LEVEL_UP)}/{DAYS_TO_LEVEL_UP}</span>
            </div>
            <div className="h-2 bg-bg rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow transition-all"
                style={{ width: `${Math.min((daysDone / DAYS_TO_LEVEL_UP) * 100, 100)}%` }}
              />
            </div>
            {canUp && (
              <button
                onClick={levelUp}
                className="mt-3 bg-yellow text-bg font-semibold rounded-lg py-2 px-4 text-sm w-full active:scale-95 transition-transform"
              >
                Level up to {up} pulses
              </button>
            )}
          </div>
        ) : (
          <p className="text-text-dim text-xs">Top level reached 🏆</p>
        )}
      </div>

      {/* Training */}
      <div>
        <h2 className="font-semibold mb-3">Training</h2>
        <div className="bg-surface rounded-xl p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-text-dim">Run target</span>
            <span className="font-semibold">{trainingState.runMinutes} min</span>
          </div>
          <div className="h-px bg-border" />
          {STRENGTH_CIRCUIT.map((ex) => (
            <div key={ex.key} className="flex justify-between text-sm">
              <span className="text-text-dim">{ex.name}</span>
              <span className="font-semibold">
                {trainingState.strength[ex.key]}{ex.perSide ? ' / side' : ' reps'}
              </span>
            </div>
          ))}
          <div className="h-px bg-border" />
          <div className="flex justify-between text-xs text-text-dim">
            <span>Strength sessions this level</span>
            <span>{strengthSessions}/{PROGRESSION.sessionsToRamp}</span>
          </div>
          <div className="flex justify-between text-xs text-text-dim">
            <span>Run sessions this level</span>
            <span>{runSessions}/{PROGRESSION.sessionsToRamp}</span>
          </div>
        </div>
      </div>

      {/* This Week */}
      <div>
        <h2 className="font-semibold mb-3">This Week</h2>
        <div className="bg-surface rounded-xl p-4">
          {loadingExercises ? (
            <p className="text-text-dim text-sm text-center py-4">Loading...</p>
          ) : (
            <WeekCalendar exercises={exercises} weekStartDate={profile.weekStartDate} />
          )}
        </div>
        <button
          onClick={() => setShowHistory((v) => !v)}
          className="flex items-center gap-1 text-text-dim text-xs mt-2 ml-1 active:opacity-70"
        >
          <ChevronDown size={14} className={`transition-transform ${showHistory ? 'rotate-180' : ''}`} />
          {showHistory ? 'Hide' : 'Show'} last 30 days
        </button>
        {showHistory && (
          <div className="bg-surface rounded-xl p-4 mt-2">
            {loadingExercises ? (
              <p className="text-text-dim text-sm text-center py-4">Loading...</p>
            ) : (
              <HistoryGrid exercises={exercises} registrationDate={profile.weekStartDate} />
            )}
          </div>
        )}
      </div>

      {/* Shields */}
      <div>
        <h2 className="font-semibold mb-3">Streak Shields</h2>
        <div className="bg-surface rounded-xl p-4">
          <p className="text-sm">Owned: <span className="text-blue font-bold">{profile.shieldsOwned}</span> / {SHIELDS.max}</p>
          <p className="text-text-dim text-xs mt-1">Auto-covers a missed day so it doesn't break your streak</p>
          <button
            onClick={buyShield}
            disabled={profile.totalPoints < SHIELDS.cost || profile.shieldsOwned >= SHIELDS.max}
            className="w-full bg-blue text-white rounded-xl py-3 mt-3 disabled:opacity-40 active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <Shield size={18} />
            <span className="font-semibold text-sm">Buy Shield</span>
          </button>
          <p className="text-text-dim text-xs mt-1 text-center">
            {SHIELDS.cost} points
            {profile.totalPoints < SHIELDS.cost && ` — you have ${profile.totalPoints}`}
            {profile.shieldsOwned >= SHIELDS.max && ' — max shields held'}
          </p>
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

      {/* Sound & Haptics */}
      <div>
        <h2 className="font-semibold mb-3">Sound & Haptics</h2>
        <div className="bg-surface rounded-xl p-4 space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm">Sound</span>
            <input type="checkbox" checked={sound} onChange={toggleSound} className="w-5 h-5 accent-primary" />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm">Haptics (vibration)</span>
            <input type="checkbox" checked={haptics} onChange={toggleHaptics} className="w-5 h-5 accent-primary" />
          </label>
          <div className="h-px bg-border" />
          <button
            type="button"
            onClick={handleTestSound}
            disabled={soundTest === 'testing'}
            className="w-full h-11 flex items-center justify-center gap-2 bg-bg border border-border text-text font-semibold rounded-lg active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            <Volume2 size={18} />
            {soundTest === 'testing' ? 'Starting sound...' : 'Test sound'}
          </button>
          {soundTest !== 'idle' && soundTest !== 'testing' && (
            <div className="space-y-2">
              <p className={`text-xs ${soundTest === 'accepted' ? 'text-green' : 'text-yellow'}`}>
                {soundTest === 'accepted' ? 'Playback accepted by iOS' : 'Playback blocked by iOS'}
              </p>
              <audio
                controls
                playsInline
                preload="auto"
                src="/complete.mp3"
                className="w-full h-10"
              />
            </div>
          )}
          <p className="text-text-dim text-[10px]">
            iOS only vibrates web apps within ~1s of a tap — timer cues (rest end, completion) can't buzz; sound covers those.
          </p>
        </div>
        <div className="mt-2 ml-1">
          <SoundDiagnostics />
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

      {/* Account */}
      <div>
        <h2 className="font-semibold mb-3">Account</h2>
        <div className="bg-surface rounded-xl p-4">
          <p className="text-text-dim text-xs">Account ID (for the Apple Health walk Shortcut)</p>
          <p className="text-sm font-mono break-all select-all mt-1">{user?.$id}</p>
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
