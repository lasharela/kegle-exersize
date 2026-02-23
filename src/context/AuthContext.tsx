import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { ID, Query, Permission, Role, type Models } from 'appwrite'
import { account, databases, DATABASE_ID, PROFILES_COLLECTION, EXERCISES_COLLECTION } from '../lib/appwrite'
import type { Profile, Exercise } from '../lib/types'

interface AuthState {
  user: Models.User<Models.Preferences> | null
  profile: Profile | null
  streakDays: number
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string, initials: string) => Promise<void>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateProfile: (data: Partial<Profile>) => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [streakDays, setStreakDays] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchStreak = useCallback(async (userId: string) => {
    try {
      const res = await databases.listDocuments(DATABASE_ID, EXERCISES_COLLECTION, [
        Query.equal('userId', userId),
        Query.equal('completed', true),
        Query.orderDesc('date'),
        Query.limit(100),
      ])
      const dates = new Set((res.documents as unknown as Exercise[]).map((e) => e.date))
      const today = new Date().toISOString().split('T')[0]
      if (!dates.has(today)) { setStreakDays(0); return }
      let streak = 1
      const d = new Date()
      while (true) {
        d.setDate(d.getDate() - 1)
        if (dates.has(d.toISOString().split('T')[0])) streak++
        else break
      }
      setStreakDays(streak)
    } catch {
      setStreakDays(0)
    }
  }, [])

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const res = await databases.listDocuments(DATABASE_ID, PROFILES_COLLECTION, [
        Query.equal('userId', userId),
        Query.limit(1),
      ])
      if (res.documents.length > 0) {
        setProfile(res.documents[0] as unknown as Profile)
      }
    } catch (e) {
      console.error('Failed to fetch profile:', e)
    }
  }, [])

  useEffect(() => {
    account.get()
      .then(async (u) => {
        setUser(u)
        await Promise.all([fetchProfile(u.$id), fetchStreak(u.$id)])
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [fetchProfile, fetchStreak])

  const login = async (email: string, password: string) => {
    await account.createEmailPasswordSession(email, password)
    const u = await account.get()
    setUser(u)
    await Promise.all([fetchProfile(u.$id), fetchStreak(u.$id)])
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
        currentTarget: 400,
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
    if (user) await Promise.all([fetchProfile(user.$id), fetchStreak(user.$id)])
  }

  const updateProfile = async (data: Partial<Profile>) => {
    if (!profile) return
    const { $id, ...rest } = data
    void $id
    await databases.updateDocument(DATABASE_ID, PROFILES_COLLECTION, profile.$id, rest)
    await refreshProfile()
  }

  return (
    <AuthContext.Provider value={{ user, profile, streakDays, loading, login, register, logout, refreshProfile, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
