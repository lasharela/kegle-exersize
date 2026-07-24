// On-device sound debugging: shows exactly which audio layer works so an
// iPhone report ("test beep plays but session cues don't", "keep-alive not
// playing") pinpoints the failure instead of guessing.
import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useSound } from '../hooks/useSound'
import { audioSessionInfo } from '../lib/audio-session'
import { soundEngineInfo, type SoundName } from '../lib/sound-player'
import { soundEnabled } from '../lib/settings'
import { APP_VERSION } from '../lib/version'

function isStandalone(): boolean {
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  return 'standalone' in navigator && !!(navigator as unknown as { standalone: boolean }).standalone
}

function Row({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-text-dim">{label}</span>
      <span className={ok === undefined ? 'text-text' : ok ? 'text-green' : 'text-yellow'}>{value}</span>
    </div>
  )
}

export default function SoundDiagnostics() {
  const [open, setOpen] = useState(false)
  const [tick, setTick] = useState(0)
  const { initAudio } = useSound()

  // Refresh the live readouts every second while open.
  useEffect(() => {
    if (!open) return
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [open])
  void tick

  const session = audioSessionInfo()
  const engine = soundEngineInfo()

  const tests: { label: string; name: SoundName }[] = [
    { label: 'Chime up', name: 'chimeUp' },
    { label: 'Chime down', name: 'chimeDown' },
    { label: 'Beep', name: 'beep' },
    { label: 'Break', name: 'breakStart' },
    { label: 'Fanfare', name: 'complete' },
  ]

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-text-dim text-xs active:opacity-70"
      >
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        Sound diagnostics
      </button>

      {open && (
        <div className="bg-surface rounded-xl p-4 mt-2 space-y-2">
          <Row label="Mode" value={isStandalone() ? 'standalone (installed PWA)' : 'browser tab'} />
          <Row label="Sound setting" value={soundEnabled() ? 'on' : 'OFF'} ok={soundEnabled()} />
          <Row label="audioSession API" value={session.supported ? `yes (${session.type})` : 'not supported'} ok={session.supported} />
          <Row label="Engine" value={engine.mode} />
          <Row label="Engine state" value={`${engine.unlocked ? 'ready' : 'not unlocked'} (${engine.state})`} ok={engine.unlocked} />
          {engine.lastError && <Row label="Last error" value={engine.lastError} ok={false} />}
          <Row label="Version" value={APP_VERSION} />
          <Row label="Build" value={new Date(__BUILD_TIME__).toLocaleString()} />

          <div className="h-px bg-border my-1" />
          <div className="grid grid-cols-3 gap-2">
            {tests.map((t) => (
              <button
                key={t.label}
                onClick={() => { void initAudio(t.name) }}
                className="bg-bg border border-border text-text-dim text-xs rounded-lg py-2 active:scale-95 transition-transform"
              >
                ▶ {t.label}
              </button>
            ))}
          </div>
          <p className="text-text-dim text-[10px]">
            Start and Resume also play an immediate confirmation cue.
          </p>
        </div>
      )}
    </div>
  )
}
