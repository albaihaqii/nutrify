import { useQuery } from '@tanstack/react-query'
import { REFRESH_INTERVAL_MS } from '@/config/realtime'
import { type PlantId } from '@/lib/plants'
import { fetchPlantDetail, fetchPlantSummaries } from './plants-api'

export function usePlantList() {
  return useQuery({
    queryKey: ['plants', 'list'],
    queryFn: fetchPlantSummaries,
    refetchInterval: REFRESH_INTERVAL_MS,
  })
}

export function usePlantDetail(plantId: PlantId) {
  return useQuery({
    queryKey: ['plants', 'detail', plantId],
    queryFn: () => fetchPlantDetail(plantId),
    refetchInterval: REFRESH_INTERVAL_MS,
  })
}
