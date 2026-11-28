import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { REFRESH_INTERVAL_MS } from '@/config/realtime'
import { type ObservationFilters } from '../data/history'
import { fetchObservationPage } from './history-api'

export function useObservationHistory(filters: ObservationFilters) {
  return useQuery({
    queryKey: ['history', 'observations', filters],
    queryFn: () => fetchObservationPage(filters),
    placeholderData: keepPreviousData,
    refetchInterval: REFRESH_INTERVAL_MS,
  })
}
