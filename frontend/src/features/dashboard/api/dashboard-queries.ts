import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { REFRESH_INTERVAL_MS } from '@/config/realtime'
import { useSensorHistory } from '@/features/sensors/api/sensors-queries'
import { type ChartRange } from '../data/sensor-series'
import { toSeries } from '../lib/series'
import {
  fetchDailyConditions,
  fetchLatestObservations,
  fetchPlantReadings,
} from './dashboard-api'

/** pH and EC chart: real sensor history, shared with the Sensor tandon page. */
export function useSensorSeries(range: ChartRange) {
  const history = useSensorHistory(range)

  return useMemo(
    () => ({
      ...history,
      data: history.data && toSeries(range, history.data),
    }),
    [history, range]
  )
}

export function usePlantReadings() {
  return useQuery({
    queryKey: ['dashboard', 'plants'],
    queryFn: fetchPlantReadings,
    refetchInterval: REFRESH_INTERVAL_MS,
  })
}

export function useDailyConditions() {
  return useQuery({
    queryKey: ['dashboard', 'daily-conditions'],
    queryFn: fetchDailyConditions,
    refetchInterval: REFRESH_INTERVAL_MS,
  })
}

export function useObservations() {
  return useQuery({
    queryKey: ['dashboard', 'observations'],
    queryFn: fetchLatestObservations,
    refetchInterval: REFRESH_INTERVAL_MS,
  })
}
