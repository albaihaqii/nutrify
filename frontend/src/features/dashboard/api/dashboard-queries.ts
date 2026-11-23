import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { REFRESH_INTERVAL_MS } from '@/config/realtime'
import { mockRequest } from '@/lib/mock-request'
import { useSensorHistory } from '@/features/sensors/api/sensors-queries'
import { latestAdvice, type AdvisorAdvice } from '../data/advisor'
import { latestAlerts } from '../data/alerts'
import { dailyConditions } from '../data/daily-conditions'
import { modelAccuracies } from '../data/models'
import { observations } from '../data/observations'
import { plantReadings } from '../data/plants'
import { type ChartRange } from '../data/sensor-series'
import { toSeries } from '../lib/series'

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

// The hooks below still return dummy data. Wiring an endpoint means
// replacing the mockRequest(...) call inside queryFn, nothing else.

export function usePlantReadings() {
  return useQuery({
    queryKey: ['dashboard', 'plants'],
    queryFn: () => mockRequest(plantReadings, []),
    refetchInterval: REFRESH_INTERVAL_MS,
  })
}

export function useDailyConditions() {
  return useQuery({
    queryKey: ['dashboard', 'daily-conditions'],
    queryFn: () => mockRequest(dailyConditions, []),
    refetchInterval: REFRESH_INTERVAL_MS,
  })
}

export function useLatestAdvice() {
  return useQuery({
    queryKey: ['dashboard', 'advice'],
    queryFn: () => mockRequest<AdvisorAdvice | null>(latestAdvice, null),
    refetchInterval: REFRESH_INTERVAL_MS,
  })
}

export function useLatestAlerts() {
  return useQuery({
    queryKey: ['dashboard', 'alerts'],
    queryFn: () => mockRequest(latestAlerts, []),
    refetchInterval: REFRESH_INTERVAL_MS,
  })
}

export function useObservations() {
  return useQuery({
    queryKey: ['dashboard', 'observations'],
    queryFn: () => mockRequest(observations, []),
    refetchInterval: REFRESH_INTERVAL_MS,
  })
}

export function useModelAccuracies() {
  return useQuery({
    queryKey: ['dashboard', 'model-accuracies'],
    queryFn: () => mockRequest(modelAccuracies, []),
    refetchInterval: REFRESH_INTERVAL_MS,
  })
}
