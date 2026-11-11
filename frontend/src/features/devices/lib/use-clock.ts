import { useEffect, useState } from 'react'

/** Current time in milliseconds, refreshed every `intervalMs`. */
export function useClock(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])

  return now
}
