import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { REALTIME_INTERVAL_MS, REFRESH_INTERVAL_MS } from '@/config/realtime'
import { mockRequest } from '@/lib/mock-request'
import { latestAdvice, type AdvisorAdvice } from '../data/advisor'
import { latestAlerts } from '../data/alerts'
import { dailyConditions } from '../data/daily-conditions'
import { modelAccuracies } from '../data/models'
import { observations } from '../data/observations'
import { plantReadings } from '../data/plants'
import { sensorSeries, type ChartRange } from '../data/sensor-series'

// Every hook below returns dummy data for now. Wiring an endpoint means
// replacing the mockRequest(...) call inside queryFn, nothing else.

export function useSensorSeries(range: ChartRange) {
  return useQuery({
    queryKey: ['dashboard', 'sensor-series', range],
    queryFn: () => mockRequest(sensorSeries[range], { points: [], ticks: [] }),
    placeholderData: keepPreviousData,
    refetchInterval:
      range === '1h' ? REALTIME_INTERVAL_MS : REFRESH_INTERVAL_MS,
  })
}

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
