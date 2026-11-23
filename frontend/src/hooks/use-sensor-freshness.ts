import { useEffect, useRef, useState } from 'react'
import { STALE_AFTER_MS } from '@/config/realtime'
import { deriveFreshness, type FreshnessState } from '@/lib/freshness'
import { useNow } from '@/hooks/use-now'
import {
  useLatestReading,
  useSensorSettings,
} from '@/features/sensors/api/sensors-queries'

/** A check that has not finished by now is dropped, so it cannot stay forever. */
const CHECK_GRACE_MS = 3_000
/** How long the "data is back" message stays. */
const RECOVERED_MS = 5_000

/**
 * True while the data is re-checked right after the person returned to the
 * tab, so an old reading is not shown as a problem before the new one arrives.
 */
function useFocusCheck(isFetching: boolean): boolean {
  const [armed, setArmed] = useState(false)
  const sawFetch = useRef(false)

  useEffect(() => {
    let timer: number | undefined
    const arm = () => {
      if (document.visibilityState === 'hidden') return
      sawFetch.current = false
      setArmed(true)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setArmed(false), CHECK_GRACE_MS)
    }
    window.addEventListener('focus', arm)
    document.addEventListener('visibilitychange', arm)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('focus', arm)
      document.removeEventListener('visibilitychange', arm)
    }
  }, [])

  useEffect(() => {
    if (!armed) return
    if (isFetching) sawFetch.current = true
    else if (sawFetch.current) setArmed(false)
  }, [armed, isFetching])

  return armed && isFetching
}

/** True for a few seconds after a problem (stale or unreachable) is over. */
function useRecoveryNotice(problem: boolean, now: number): boolean {
  const [hadProblem, setHadProblem] = useState(problem)
  const [recoveredAt, setRecoveredAt] = useState<number | null>(null)

  // Adjusted while rendering: the moment a problem ends is when the notice starts.
  if (problem !== hadProblem) {
    setHadProblem(problem)
    setRecoveredAt(hadProblem && !problem ? now : null)
  }

  return recoveredAt !== null && now - recoveredAt < RECOVERED_MS
}

export interface SensorFreshness {
  state: FreshnessState
  /** Seconds since the sensor measured the newest reading. */
  ageSeconds: number | null
  /** The data was stale or unreachable a moment ago and is fine again. */
  recovered: boolean
}

/** Age and health of the newest sensor reading, ticking every second. */
export function useSensorFreshness(): SensorFreshness {
  const latest = useLatestReading()
  const settings = useSensorSettings()
  const now = useNow(1_000)
  const checking = useFocusCheck(latest.isFetching)

  const reading = latest.data
  const ageSeconds = reading
    ? Math.max(0, Math.floor((now - reading.recordedAt) / 1_000))
    : null

  const state = deriveFreshness({
    hasReading: Boolean(reading),
    ageSeconds,
    staleSeconds: settings.data?.staleSeconds ?? STALE_AFTER_MS / 1_000,
    unreachable: latest.isError,
    checking,
  })
  // A recheck of old data still counts as the problem: the notice is only for
  // data that really came back.
  const recovered = useRecoveryNotice(
    state === 'stale' || state === 'unreachable' || state === 'checking',
    now
  )

  return { state, ageSeconds, recovered }
}
