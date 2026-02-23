import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { ID, Query, Permission, Role, type Models } from 'appwrite'
import { account, databases, DATABASE_ID, PROFILES_COLLECTION } from '../lib/appwrite'
import type { Profile } from '../lib/types'

interface AuthState {
  user: Models.User<Models.Preferences> | null
  profile: Profile | null
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
  const [loading, setLoading] = useState(true)

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
        await fetchProfile(u.$id)
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [fetchProfile])

  const login = async (email: string, password: string) => {
    await account.createEmailPasswordSession(email, password)
    const u = await account.get()
    setUser(u)
    await fetchProfile(u.$id)
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
    if (user) await fetchProfile(user.$id)
  }

  const updateProfile = async (data: Partial<Profile>) => {
    if (!profile) return
    const { $id, ...rest } = data
    void $id
    await databases.updateDocument(DATABASE_ID, PROFILES_COLLECTION, profile.$id, rest)
    await refreshProfile()
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, register, logout, refreshProfile, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
