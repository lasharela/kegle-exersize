import { useAuth } from '../context/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'

export default function Header() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  if (!profile) return null

  const isSettings = location.pathname === '/settings'

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-border">
      <div className="flex items-center gap-2">
        <span className="text-green font-bold text-lg">{profile.totalPoints}</span>
        <span className="text-text-dim text-xs">pts</span>
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
          profile.initials
        )}
      </button>
    </header>
  )
}
