import { useMemo } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { REALTIME_INTERVAL_MS, REFRESH_INTERVAL_MS } from '@/config/realtime'
import { type BoundaryQuery } from '@/components/query-boundary'
import {
  type SensorHistory,
  type SensorRange,
  type SensorRows,
  type SensorSample,
} from '../data/sensors'
import { fetchHistory, fetchLatest, fetchSensorSettings } from './sensors-api'

/** Ideal ranges and the stale limit; edited rarely, so refreshed slowly. */
export function useSensorSettings() {
  return useQuery({
    queryKey: ['sensors', 'settings'],
    queryFn: fetchSensorSettings,
    refetchInterval: 30_000,
  })
}

/** The newest reading; null when the sensor has never sent one. */
export function useLatestReading() {
  return useQuery({
    queryKey: ['sensors', 'latest'],
    queryFn: fetchLatest,
    refetchInterval: REALTIME_INTERVAL_MS,
  })
}

/**
 * Chart data: one averaged series per range, plus the ideal ranges. Every
 * chart and table of a range reads the same cached request.
 */
export function useSensorHistory(
  range: SensorRange
): BoundaryQuery<SensorHistory> {
  const {
    data: samplesData,
    isPending: samplesPending,
    refetch: refetchSamples,
  } = useQuery({
    queryKey: ['sensors', 'history', range],
    queryFn: () => fetchHistory(range),
    placeholderData: keepPreviousData,
    refetchInterval:
      range === '1h' ? REALTIME_INTERVAL_MS : REFRESH_INTERVAL_MS,
  })
  const {
    data: settingsData,
    isPending: settingsPending,
    refetch: refetchSettings,
  } = useSensorSettings()

  return useMemo(
    () => ({
      data:
        samplesData && settingsData
          ? { samples: samplesData, ideal: settingsData.ideal }
          : undefined,
      isPending: samplesPending || settingsPending,
      refetch: () => Promise.all([refetchSamples(), refetchSettings()]),
    }),
    [
      samplesData,
      settingsData,
      samplesPending,
      settingsPending,
      refetchSamples,
      refetchSettings,
    ]
  )
}

/** Table data: every row of the same series, newest first. */
export function useSensorRows(range: SensorRange): BoundaryQuery<SensorRows> {
  const history = useSensorHistory(range)

  return useMemo(
    () => ({
      ...history,
      data: history.data && {
        rows: [...history.data.samples].reverse(),
        ideal: history.data.ideal,
      },
    }),
    [history]
  )
}

/** Every row of the range, for the CSV export. */
export function fetchSensorExport(range: SensorRange): Promise<SensorSample[]> {
  return fetchHistory(range)
}
