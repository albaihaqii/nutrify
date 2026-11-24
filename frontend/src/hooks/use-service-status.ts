import { useQuery } from '@tanstack/react-query'
import { REALTIME_INTERVAL_MS } from '@/config/realtime'
import { api } from '@/lib/api'

interface ServiceStatus {
  webcam: boolean
  sensor: boolean
  advisor: boolean
}

// GET /api/status (docs/API.md, section 3). The advisor chip stays offline
// until the advisor is built.
async function fetchServiceStatus(): Promise<ServiceStatus> {
  const { data } = await api.get<ServiceStatus>('/status')
  return { webcam: data.webcam, sensor: data.sensor, advisor: data.advisor }
}

export function useServiceStatus() {
  return useQuery({
    queryKey: ['status'],
    queryFn: fetchServiceStatus,
    refetchInterval: REALTIME_INTERVAL_MS,
  })
}
