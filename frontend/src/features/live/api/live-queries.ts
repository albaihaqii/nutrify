import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { REALTIME_INTERVAL_MS, REFRESH_INTERVAL_MS } from '@/config/realtime'
import { mockRequest } from '@/lib/mock-request'
import {
  useLatestReading,
  useSensorSettings,
} from '@/features/sensors/api/sensors-queries'
import { liveAdvice, type LiveAdvice } from '../data/live-advice'
import {
  emptyAnalysis,
  liveAnalysis,
  type LiveAnalysis,
} from '../data/live-analysis'
import { type SensorContextItem } from '../data/sensor-context'
import { buildSensorContext } from '../lib/sensor-context'

// The sensor context is real; the hooks below it still return dummy data.
// Wiring an endpoint means replacing the mockRequest(...) call inside queryFn.

export function useLiveAnalysis(paused: boolean) {
  return useQuery({
    queryKey: ['live', 'analysis'],
    queryFn: () => mockRequest<LiveAnalysis>(liveAnalysis, emptyAnalysis),
    refetchInterval: paused ? false : REALTIME_INTERVAL_MS,
  })
}

/** The four sensor values beside the webcam: newest reading and ideal ranges. */
export function useSensorContext() {
  const latest = useLatestReading()
  const settings = useSensorSettings()

  const data = useMemo((): SensorContextItem[] | undefined => {
    if (latest.data === undefined || settings.data === undefined) {
      return undefined
    }
    return buildSensorContext(latest.data, settings.data.ideal)
  }, [latest.data, settings.data])

  return {
    data,
    isPending: latest.isPending || settings.isPending,
    refetch: () => Promise.all([latest.refetch(), settings.refetch()]),
  }
}

export function useLiveAdvice() {
  return useQuery({
    queryKey: ['live', 'advice'],
    queryFn: () => mockRequest<LiveAdvice | null>(liveAdvice, null),
    refetchInterval: REFRESH_INTERVAL_MS,
  })
}
