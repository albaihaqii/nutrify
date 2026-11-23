import { useLatestReading } from '@/features/sensors/api/sensors-queries'

type ServiceStatus = {
  webcam: boolean
  sensor: boolean
  advisor: boolean
}

// The sensor chip is real: it follows the newest reading. The webcam and the
// advisor have no endpoint yet, so they show offline until those are built.
// The final version reads GET /api/status (docs/API.md, section 3).
export function useServiceStatus() {
  const latest = useLatestReading()

  const data: ServiceStatus | undefined = latest.isPending
    ? undefined
    : {
        webcam: false,
        sensor: latest.data ? !latest.data.isStale : false,
        advisor: false,
      }

  return { data }
}
