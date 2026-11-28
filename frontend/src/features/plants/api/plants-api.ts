import { AxiosError } from 'axios'
import { api } from '@/lib/api'
import { plantIds, type PlantId } from '@/lib/plants'
import {
  type PlantDetail,
  type PlantDetailResponse,
  type PlantsResponse,
  type PlantSummary,
} from '../data/plants'
import { toPlantDetail, toPlantSummaries } from '../lib/plants'

export async function fetchPlantSummaries(): Promise<PlantSummary[]> {
  const { data } = await api.get<PlantsResponse>('/plants')
  return toPlantSummaries(data)
}

/** The detail of a hole; null while the worker has stored nothing for it. */
export async function fetchPlantDetail(
  plantId: PlantId
): Promise<PlantDetail | null> {
  try {
    const { data } = await api.get<PlantDetailResponse>(
      `/plants/${plantIds.indexOf(plantId) + 1}`
    )
    return toPlantDetail(data)
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status === 404) {
      return null
    }
    throw error
  }
}
