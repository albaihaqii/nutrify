import { id } from '@/locales/id'
import { statusOfApi } from '@/lib/plant-status'
import { plantIdOf } from '@/lib/plants'
import { ruleStepLabel } from '@/lib/rule-path'
import { type LiveStatus } from '@/features/live/data/live-analysis'
import {
  type PlantDetail,
  type PlantDetailResponse,
  type PlantsResponse,
  type PlantSummary,
  type StatusEntry,
} from '../data/plants'

export function toPlantSummaries({ items }: PlantsResponse): PlantSummary[] {
  return items.flatMap((item) => {
    const plantId = plantIdOf(item.position)
    const status = item.status === null ? undefined : statusOfApi[item.status]
    const last = item.last_observation
    if (plantId === undefined || status === undefined || last === null) {
      return []
    }
    return {
      id: plantId,
      status,
      confidence: last.confidence,
      updatedAt: last.observed_at,
      observationId: last.id,
    }
  })
}

/** The path to the class, only when the tree gave one: a status with no class has none. */
function pathOf(
  steps: PlantDetailResponse['latest_observation']['rule_path'],
  status: LiveStatus
): string[] {
  if (status === 'check' || status === 'none' || steps === null) return []
  return [...steps.map(ruleStepLabel), `→ ${id.plantStatus[status]}`]
}

export function toPlantDetail(
  response: PlantDetailResponse
): PlantDetail | null {
  const plantId = plantIdOf(response.position)
  const status = statusOfApi[response.status]
  if (plantId === undefined || status === undefined) return null

  const { latest_observation: latest } = response
  const { mean_r: r, mean_g: g, mean_b: b } = latest.features
  const history = response.status_history.flatMap((entry): StatusEntry[] => {
    const entryStatus = statusOfApi[entry.status]
    return entryStatus === undefined
      ? []
      : [{ at: entry.since, status: entryStatus, confidence: entry.confidence }]
  })

  return {
    id: plantId,
    status,
    confidence: latest.confidence,
    updatedAt: latest.observed_at,
    observationId: latest.id,
    hasImage: latest.has_image,
    mean: r === null || g === null || b === null ? null : { r, g, b },
    path: pathOf(latest.rule_path, status),
    history,
  }
}
