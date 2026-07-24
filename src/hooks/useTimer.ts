import { useEffect, useRef, useCallback, useState } from 'react'

export function useTimer(onTick: (deltaMs: number) => void, intervalMs: number, active: boolean) {
  const tickRef = useRef(onTick)
  useEffect(() => { tickRef.current = onTick })

  const intervalRef = useRef<number | null>(null)
  const lastTickRef = useRef<number | null>(null)

  const stop = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    lastTickRef.current = null
  }, [])

  useEffect(() => {
    if (active) {
      lastTickRef.current = performance.now()
      intervalRef.current = window.setInterval(() => {
        const now = performance.now()
        const last = lastTickRef.current ?? now
        lastTickRef.current = now
        tickRef.current(Math.min(now - last, 1000))
      }, intervalMs)
    } else {
      stop()
    }
    return stop
  }, [active, intervalMs, stop])
}

export function useElapsed(active: boolean) {
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    if (!active) { startRef.current = null; return }
    startRef.current = Date.now() - elapsed * 1000
    const id = setInterval(() => {
      if (startRef.current !== null) setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
    }, 1000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  const reset = useCallback(() => { setElapsed(0); startRef.current = null }, [])
  return { elapsed, reset }
}
