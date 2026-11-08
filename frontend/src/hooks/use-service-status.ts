import { useQuery } from '@tanstack/react-query'
import { REALTIME_INTERVAL_MS } from '@/config/realtime'
import { getMockScenario, mockRequest } from '@/lib/mock-request'

export type ServiceStatus = {
  webcam: boolean
  sensor: boolean
  advisor: boolean
}

// Dummy until the status endpoint exists; the real one replaces queryFn only.
export function useServiceStatus() {
  return useQuery({
    queryKey: ['service-status'],
    queryFn: () => {
      const scenario = getMockScenario()
      const sensorOnline = scenario !== 'offline' && scenario !== 'stale'
      return mockRequest<ServiceStatus>({
        webcam: true,
        sensor: sensorOnline,
        advisor: true,
      })
    },
    refetchInterval: REALTIME_INTERVAL_MS,
  })
}
