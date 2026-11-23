import { useMemo } from 'react'
import {
  useLatestReading,
  useSensorHistory,
  useSensorSettings,
} from '@/features/sensors/api/sensors-queries'
import { type KpiMetric } from '../data/kpis'
import { buildKpiMetrics } from '../lib/kpi'

type KpiSnapshot = { metrics: KpiMetric[] }

/** The four sensor cards, from the newest reading, the settings and the last hour. */
export function useKpiSnapshot() {
  const latest = useLatestReading()
  const settings = useSensorSettings()
  const lastHour = useSensorHistory('1h')

  const data = useMemo((): KpiSnapshot | undefined => {
    if (latest.data === undefined || settings.data === undefined) {
      return undefined
    }
    if (latest.data === null) return { metrics: [] }
    return {
      metrics: buildKpiMetrics(
        latest.data,
        settings.data.ideal,
        lastHour.data?.samples ?? []
      ),
    }
  }, [latest.data, settings.data, lastHour.data])

  return {
    data,
    isPending: latest.isPending || settings.isPending,
    refetch: () =>
      Promise.all([latest.refetch(), settings.refetch(), lastHour.refetch()]),
  }
}
