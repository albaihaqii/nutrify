import { useQuery } from '@tanstack/react-query'
import { REFRESH_INTERVAL_MS } from '@/config/realtime'
import { mockRequest } from '@/lib/mock-request'
import {
  buildPlantDetails,
  buildPlantSummaries,
  type PlantDetail,
  type PlantSummary,
} from '../data/plants'

// Dummy data for now. Wiring an endpoint means replacing the mockRequest(...)
// call inside each queryFn, nothing else.

export function usePlantList() {
  return useQuery({
    queryKey: ['plants', 'list'],
    queryFn: () => mockRequest<PlantSummary[]>(buildPlantSummaries(), []),
    refetchInterval: REFRESH_INTERVAL_MS,
  })
}

export function usePlantDetail(plantId: string) {
  return useQuery({
    queryKey: ['plants', 'detail', plantId],
    queryFn: () =>
      mockRequest<PlantDetail | null>(
        buildPlantDetails().find((plant) => plant.id === plantId) ?? null,
        null
      ),
    refetchInterval: REFRESH_INTERVAL_MS,
  })
}
