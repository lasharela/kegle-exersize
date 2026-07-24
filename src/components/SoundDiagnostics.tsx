// On-device sound debugging: shows exactly which audio layer works so an
// iPhone report ("test beep plays but session cues don't", "keep-alive not
// playing") pinpoints the failure instead of guessing.
import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useSound } from '../hooks/useSound'
import { audioSessionInfo, keepAliveState, startSilentKeepAlive, primeAudioSession } from '../lib/audio-session'
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
  const { squeezeChime, releaseChime, fastBeep, breakSound, completionFanfare, initAudio } = useSound()

  // Refresh the live readouts every second while open.
  useEffect(() => {
    if (!open) return
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [open])
  void tick

  const session = audioSessionInfo()
  const keepAlive = keepAliveState()

  const tests: { label: string; play: () => void }[] = [
    { label: 'Chime up', play: squeezeChime },
    { label: 'Chime down', play: releaseChime },
    { label: 'Beep', play: fastBeep },
    { label: 'Break', play: breakSound },
    { label: 'Fanfare', play: completionFanfare },
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
          <Row
            label="Keep-alive"
            value={keepAlive.exists ? (keepAlive.playing ? `playing (${keepAlive.currentTime.toFixed(1)}s)` : 'PAUSED') : 'not started'}
            ok={keepAlive.exists && keepAlive.playing}
          />
          <Row label="Version" value={APP_VERSION} />
          <Row label="Build" value={new Date(__BUILD_TIME__).toLocaleString()} />

          <div className="h-px bg-border my-1" />
          <button
            onClick={() => { primeAudioSession(); startSilentKeepAlive() }}
            className="w-full bg-bg border border-border text-text text-sm font-semibold rounded-lg py-2 active:scale-95 transition-transform"
          >
            Unlock audio (start keep-alive)
          </button>
          <div className="grid grid-cols-3 gap-2">
            {tests.map((t) => (
              <button
                key={t.label}
                onClick={() => { initAudio(); t.play() }}
                className="bg-bg border border-border text-text-dim text-xs rounded-lg py-2 active:scale-95 transition-transform"
              >
                ▶ {t.label}
              </button>
            ))}
          </div>
          <p className="text-text-dim text-[10px]">
            If test sounds play here but session cues don't, or nothing plays with the keep-alive "playing",
            note what this panel shows — it identifies the broken layer.
          </p>
        </div>
      )}
    </div>
  )
}
