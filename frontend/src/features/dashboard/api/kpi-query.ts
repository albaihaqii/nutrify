import { useQuery } from '@tanstack/react-query'
import { REALTIME_INTERVAL_MS } from '@/config/realtime'
import { getMockScenario, mockRequest } from '@/lib/mock-request'
import { kpiMetrics, type KpiMetric } from '../data/kpis'

export type KpiSnapshot = {
  metrics: KpiMetric[]
  /** When the sensor reading was taken (ms since epoch). */
  measuredAt: number
}

// Dummy until GET /api/sensor-readings/latest is wired in; only queryFn changes.
export function useKpiSnapshot() {
  return useQuery({
    queryKey: ['dashboard', 'kpi'],
    queryFn: async (): Promise<KpiSnapshot> => {
      const minutesAgo = getMockScenario() === 'stale' ? 14 : 1
      const metrics = await mockRequest(kpiMetrics, [])
      return { metrics, measuredAt: Date.now() - minutesAgo * 60_000 }
    },
    refetchInterval: REALTIME_INTERVAL_MS,
  })
}
