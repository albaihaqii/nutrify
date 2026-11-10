import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { REALTIME_INTERVAL_MS, REFRESH_INTERVAL_MS } from '@/config/realtime'
import { mockRequest } from '@/lib/mock-request'
import {
  buildSensorHistory,
  buildSensorRows,
  emptyHistory,
  emptyRows,
  type SensorHistory,
  type SensorRange,
  type SensorRows,
  type SensorSample,
} from '../data/sensors'

// Dummy data for now. Wiring the backend means replacing the mockRequest(...)
// calls below (GET /api/sensor-readings and GET /api/settings), nothing else.

/** Chart data: one downsampled series per range, plus the ideal ranges. */
export function useSensorHistory(range: SensorRange) {
  return useQuery({
    queryKey: ['sensors', 'history', range],
    queryFn: () =>
      mockRequest<SensorHistory>(buildSensorHistory(range), emptyHistory),
    placeholderData: keepPreviousData,
    refetchInterval:
      range === '1h' ? REALTIME_INTERVAL_MS : REFRESH_INTERVAL_MS,
  })
}

/** Table data: the newest raw rows and how many rows the range holds. */
export function useSensorRows(range: SensorRange) {
  return useQuery({
    queryKey: ['sensors', 'rows', range],
    queryFn: () => mockRequest<SensorRows>(buildSensorRows(range), emptyRows),
    placeholderData: keepPreviousData,
    refetchInterval: REALTIME_INTERVAL_MS,
  })
}

/** Every row of the range, for the CSV export. */
export async function fetchSensorExport(
  range: SensorRange
): Promise<SensorSample[]> {
  const history = await mockRequest<SensorHistory>(
    buildSensorHistory(range),
    emptyHistory
  )
  return history.samples
}
