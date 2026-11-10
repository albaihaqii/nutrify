import { useQuery } from '@tanstack/react-query'
import { REALTIME_INTERVAL_MS, REFRESH_INTERVAL_MS } from '@/config/realtime'
import { mockRequest } from '@/lib/mock-request'
import { liveAdvice, type LiveAdvice } from '../data/live-advice'
import {
  emptyAnalysis,
  liveAnalysis,
  type LiveAnalysis,
} from '../data/live-analysis'
import { sensorContext, type SensorContextItem } from '../data/sensor-context'

// Dummy data for now. Wiring an endpoint means replacing the mockRequest(...)
// call inside each queryFn, nothing else.

export function useLiveAnalysis(paused: boolean) {
  return useQuery({
    queryKey: ['live', 'analysis'],
    queryFn: () => mockRequest<LiveAnalysis>(liveAnalysis, emptyAnalysis),
    refetchInterval: paused ? false : REALTIME_INTERVAL_MS,
  })
}

export function useSensorContext() {
  return useQuery({
    queryKey: ['live', 'sensor-context'],
    queryFn: () => mockRequest<SensorContextItem[]>(sensorContext, []),
    refetchInterval: REALTIME_INTERVAL_MS,
  })
}

export function useLiveAdvice() {
  return useQuery({
    queryKey: ['live', 'advice'],
    queryFn: () => mockRequest<LiveAdvice | null>(liveAdvice, null),
    refetchInterval: REFRESH_INTERVAL_MS,
  })
}
