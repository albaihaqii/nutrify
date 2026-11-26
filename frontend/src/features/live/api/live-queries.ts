import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ANALYSIS_POLL_MS, REFRESH_INTERVAL_MS } from '@/config/realtime'
import { mockRequest } from '@/lib/mock-request'
import {
  useLatestReading,
  useSensorSettings,
} from '@/features/sensors/api/sensors-queries'
import { liveAdvice, type LiveAdvice } from '../data/live-advice'
import { type SensorContextItem } from '../data/sensor-context'
import { buildSensorContext } from '../lib/sensor-context'
import { fetchAnalysis } from './analysis-api'

// The analysis and the sensor context are real; the advice still returns dummy data.
// Wiring an endpoint means replacing the mockRequest(...) call inside queryFn.

/** The six plants as the vision worker last analysed them. */
export function useLiveAnalysis(paused: boolean) {
  return useQuery({
    queryKey: ['live', 'analysis'],
    queryFn: fetchAnalysis,
    refetchInterval: paused ? false : ANALYSIS_POLL_MS,
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
