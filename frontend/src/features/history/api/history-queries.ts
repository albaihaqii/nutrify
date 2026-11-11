import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { REFRESH_INTERVAL_MS } from '@/config/realtime'
import { mockRequest } from '@/lib/mock-request'
import {
  buildAdviceHistory,
  buildObservationExport,
  buildObservationPage,
  emptyPage,
  type AdviceEntry,
  type ObservationFilters,
  type ObservationPage,
  type ObservationRow,
} from '../data/history'

// Dummy data for now. Wiring the backend means replacing the mockRequest(...)
// calls below, passing the same filters and page as query parameters.

export function useObservationHistory(filters: ObservationFilters) {
  return useQuery({
    queryKey: ['history', 'observations', filters],
    queryFn: () =>
      mockRequest<ObservationPage>(buildObservationPage(filters), emptyPage),
    placeholderData: keepPreviousData,
    refetchInterval: REFRESH_INTERVAL_MS,
  })
}

export function useAdviceHistory() {
  return useQuery({
    queryKey: ['history', 'advice'],
    queryFn: () => mockRequest<AdviceEntry[]>(buildAdviceHistory(), []),
    refetchInterval: REFRESH_INTERVAL_MS,
  })
}

/** Every row matching the filters (all pages), for the CSV export. */
export async function fetchObservationExport(
  filters: ObservationFilters
): Promise<ObservationRow[]> {
  return mockRequest<ObservationRow[]>(buildObservationExport(filters), [])
}
