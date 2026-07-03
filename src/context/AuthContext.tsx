/* eslint-disable react-refresh/only-export-components -- idiomatic context module: provider + hook */
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { ID, Query, Permission, Role, type Models } from 'appwrite'
import { account, databases, DATABASE_ID, PROFILES_COLLECTION, EXERCISES_COLLECTION } from '../lib/appwrite'
import { defaultTrainingState } from '../lib/training-state'
import { computeStreak } from '../lib/streak'
import { listActivityLogs } from '../lib/activity-log'
import { SHIELDS } from '../lib/program'
import type { Profile, Exercise } from '../lib/types'
import { localDateISO } from '../lib/date'

interface AuthState {
  user: Models.User<Models.Preferences> | null
  profile: Profile | null
  streakDays: number
  shieldSavedDates: string[]
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string, initials: string) => Promise<void>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateProfile: (data: Partial<Profile>) => Promise<void>
  buyShield: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [streakDays, setStreakDays] = useState(0)
  const [shieldSavedDates, setShieldSavedDates] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const res = await databases.listDocuments(DATABASE_ID, PROFILES_COLLECTION, [
        Query.equal('userId', userId),
        Query.limit(1),
      ])
      if (res.documents.length > 0) {
        const p = res.documents[0] as unknown as Profile
        setProfile(p)
        return p
      }
    } catch (e) {
      console.error('Failed to fetch profile:', e)
    }
    return null
  }, [])

  // All-activity streak: every scheduled activity done each day (kegel-only
  // before STREAK_EPOCH), with shields auto-consumed to cover missed days.
  const fetchStreak = useCallback(async (userId: string, p: Profile | null) => {
    try {
      const [kegelRes, logs] = await Promise.all([
        databases.listDocuments(DATABASE_ID, EXERCISES_COLLECTION, [
          Query.equal('userId', userId),
          Query.equal('completed', true),
          Query.orderDesc('date'),
          Query.limit(100),
        ]),
        listActivityLogs(userId, 400),
      ])
      const kegelDates = new Set((kegelRes.documents as unknown as Exercise[]).map((e) => e.date))
      const { streak, consume } = computeStreak({
        kegelDates,
        logs,
        shieldsUsed: p?.shieldsUsed ?? [],
        shieldsOwned: p?.shieldsOwned ?? 0,
        today: localDateISO(),
      })
      setStreakDays(streak)
      if (p && consume.length > 0) {
        const updated = {
          shieldsOwned: p.shieldsOwned - consume.length,
          shieldsUsed: [...p.shieldsUsed, ...consume],
        }
        await databases.updateDocument(DATABASE_ID, PROFILES_COLLECTION, p.$id, updated)
        setProfile({ ...p, ...updated })
        setShieldSavedDates(consume)
      }
    } catch {
      setStreakDays(0)
    }
  }, [])

  useEffect(() => {
    account.get()
      .then(async (u) => {
        setUser(u)
        const p = await fetchProfile(u.$id)
        await fetchStreak(u.$id, p)
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [fetchProfile, fetchStreak])

  const login = async (email: string, password: string) => {
    await account.createEmailPasswordSession(email, password)
    const u = await account.get()
    setUser(u)
    const p = await fetchProfile(u.$id)
    await fetchStreak(u.$id, p)
  }

  const register = async (email: string, password: string, name: string, initials: string) => {
    await account.create(ID.unique(), email, password, name)
    await account.createEmailPasswordSession(email, password)
    const u = await account.get()
    setUser(u)

    const today = new Date().toISOString().split('T')[0]
    const doc = await databases.createDocument(
      DATABASE_ID,
      PROFILES_COLLECTION,
      ID.unique(),
      {
        userId: u.$id,
        initials: initials,
        totalPoints: 0,
        shieldsOwned: 0,
        shieldsUsed: [],
        currentWeek: 1,
        currentTarget: 100,
        pulseInterval: 1.5,
        reminderTime: '09:00',
        notificationsEnabled: false,
        unlockedBadges: [],
        weekStartDate: today,
        totalPulses: 0,
      },
      [
        Permission.read(Role.user(u.$id)),
        Permission.update(Role.user(u.$id)),
        Permission.delete(Role.user(u.$id)),
      ]
    )
    setProfile(doc as unknown as Profile)
  }

  const logout = async () => {
    await account.deleteSession('current')
    setUser(null)
    setProfile(null)
  }

  const refreshProfile = async () => {
    if (!user) return
    const p = await fetchProfile(user.$id)
    await fetchStreak(user.$id, p)
  }

  const updateProfile = async (data: Partial<Profile>) => {
    if (!profile) return
    const { $id, ...rest } = data
    void $id
    await databases.updateDocument(DATABASE_ID, PROFILES_COLLECTION, profile.$id, rest)
    await refreshProfile()
  }

  // Spend points on a streak shield (max held, cost from program config).
  const buyShield = async () => {
    if (!profile) return
    if (profile.totalPoints < SHIELDS.cost || profile.shieldsOwned >= SHIELDS.max) return
    await updateProfile({
      totalPoints: profile.totalPoints - SHIELDS.cost,
      shieldsOwned: profile.shieldsOwned + 1,
    })
  }

  // One-time reset to the new starting level (100) for the pre-existing account.
  // Guarded by the old default (400) so it never clobbers real progress, and by a
  // localStorage flag so it runs at most once per device.
  useEffect(() => {
    if (!profile) return
    if (localStorage.getItem('kegle.migratedTo100')) return
    localStorage.setItem('kegle.migratedTo100', '1')
    if (profile.currentTarget === 400) {
      const today = new Date().toISOString().split('T')[0]
      updateProfile({ currentTarget: 100, currentWeek: 1, weekStartDate: today }).catch(console.error)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.$id, profile?.currentTarget])

  // One-time seeding of training state for accounts that pre-date the training program.
  // Guarded by profile.trainingState being absent AND a localStorage flag to prevent loops.
  useEffect(() => {
    if (!profile) return
    if (profile.trainingState) return
    if (localStorage.getItem('kegle.trainingSeeded')) return
    localStorage.setItem('kegle.trainingSeeded', '1')
    const today = localDateISO()
    updateProfile({ trainingState: JSON.stringify(defaultTrainingState(today)) }).catch(console.error)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.$id, profile?.trainingState])

  return (
    <AuthContext.Provider value={{ user, profile, streakDays, shieldSavedDates, loading, login, register, logout, refreshProfile, updateProfile, buyShield }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
