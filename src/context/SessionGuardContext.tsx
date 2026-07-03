// Guards active workout sessions against accidental exits. Session pages
// register a guard while running; Header (and any exit path) routes through
// requestExit, which shows a confirm sheet instead of silently abandoning the
// session. The iOS swipe-back gesture is intercepted via a history sentinel.
/* eslint-disable react-refresh/only-export-components -- idiomatic context module: provider + hooks */
import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

interface Guard {
  // Called on confirmed exit. Log the partial session here. If it returns
  // 'stay', the guard closes the sheet without navigating (kegel Stop flow).
  onExit: () => void | 'stay' | Promise<void | 'stay'>
}

interface SessionGuardState {
  registerGuard: (guard: Guard | null) => void
  requestExit: (to: string) => void
  guardActive: boolean
}

const SessionGuardContext = createContext<SessionGuardState | null>(null)

export function SessionGuardProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const guardRef = useRef<Guard | null>(null)
  const [guardActive, setGuardActive] = useState(false)
  const [confirmTo, setConfirmTo] = useState<string | null>(null)

  const registerGuard = useCallback((guard: Guard | null) => {
    guardRef.current = guard
    setGuardActive(guard !== null)
    setConfirmTo(null)
  }, [])

  const requestExit = useCallback((to: string) => {
    if (guardRef.current) setConfirmTo(to)
    else navigate(to)
  }, [navigate])

  // Swipe-back / browser back during an active session: re-arm the sentinel
  // and show the confirm sheet instead of leaving.
  useEffect(() => {
    if (!guardActive) return
    window.history.pushState({ sessionGuard: true }, '')
    const onPopState = () => {
      if (!guardRef.current) return
      window.history.pushState({ sessionGuard: true }, '')
      setConfirmTo('/')
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [guardActive])

  const handleConfirm = async () => {
    const to = confirmTo
    setConfirmTo(null)
    const result = await guardRef.current?.onExit()
    guardRef.current = null
    setGuardActive(false)
    if (result !== 'stay' && to) navigate(to)
  }

  return (
    <SessionGuardContext.Provider value={{ registerGuard, requestExit, guardActive }}>
      {children}
      {confirmTo !== null && (
        <div className="fixed inset-0 bg-bg/80 z-50 flex items-end justify-center" onClick={() => setConfirmTo(null)}>
          <div
            className="w-full max-w-md bg-surface border border-border rounded-t-3xl p-6 pb-10 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-text font-bold text-lg">End session?</h2>
            <p className="text-text-dim text-sm">Your progress so far will be saved as a partial session.</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleConfirm}
                className="w-full bg-primary text-white font-bold rounded-full py-3 active:scale-95 transition-transform"
              >
                End session
              </button>
              <button
                onClick={() => setConfirmTo(null)}
                className="w-full bg-bg border border-border text-text font-semibold rounded-full py-3 active:scale-95 transition-transform"
              >
                Keep going
              </button>
            </div>
          </div>
        </div>
      )}
    </SessionGuardContext.Provider>
  )
}

export function useSessionGuardContext(): SessionGuardState {
  const ctx = useContext(SessionGuardContext)
  if (!ctx) throw new Error('useSessionGuardContext must be used within SessionGuardProvider')
  return ctx
}

// Register a guard while `active`; automatically unregisters on unmount/stop.
export function useSessionGuard(active: boolean, onExit: Guard['onExit']) {
  const { registerGuard } = useSessionGuardContext()
  const onExitRef = useRef(onExit)
  useEffect(() => { onExitRef.current = onExit })

  useEffect(() => {
    if (!active) return
    registerGuard({ onExit: (...args) => onExitRef.current(...args) })
    return () => registerGuard(null)
  }, [active, registerGuard])
}

// Exit control: navigates directly when no session is active, confirms otherwise.
export function useRequestExit() {
  return useSessionGuardContext().requestExit
}
