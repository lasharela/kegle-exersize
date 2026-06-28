import { useState } from 'react'

const STORAGE_KEY = 'kegle.ringerHintDismissed'

function isStandalone(): boolean {
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  if ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone) return true
  return false
}

export default function RingerHint() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false
    if (!isStandalone()) return false
    return !localStorage.getItem(STORAGE_KEY)
  })

  if (!visible) return null

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  return (
    <div className="flex items-start gap-3 bg-surface border border-yellow/40 rounded-xl px-4 py-3 text-sm">
      <span className="flex-1 text-text">
        🔔 For sound, turn your ringer on — iOS silences web apps on silent mode.
      </span>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="text-text-dim hover:text-text transition-colors shrink-0 text-base leading-none mt-0.5"
      >
        ×
      </button>
    </div>
  )
}
