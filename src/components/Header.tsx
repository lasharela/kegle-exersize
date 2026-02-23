import { useAuth } from '../context/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'

export default function Header() {
  const { profile, streakDays, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const isSettings = location.pathname === '/settings'
  const initials = profile?.initials ?? user?.name?.slice(0, 2)?.toUpperCase() ?? '?'

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-green font-bold text-lg">{profile?.totalPoints ?? 0}</span>
          <span className="text-text-dim text-xs">pts</span>
        </div>
        {streakDays > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-yellow font-bold text-lg">{streakDays}</span>
            <span className="text-text-dim text-xs">day streak</span>
          </div>
        )}
      </div>

      <button
        onClick={() => navigate(isSettings ? '/' : '/settings')}
        className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm active:scale-95 transition-transform"
      >
        {isSettings ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 4L4 12M4 4l8 8" />
          </svg>
        ) : (
          initials
        )}
      </button>
    </header>
  )
}
