import { statusOfApi } from '@/lib/plant-status'
import { plantIdOf } from '@/lib/plants'
import { type LiveStatus } from '@/features/live/data/live-analysis'
import {
  type DailyConditionsResponse,
  type DailyCondition,
} from '../data/daily-conditions'
import {
  type Observation,
  type ObservationsResponse,
} from '../data/observations'
import { type PlantReading, type PlantsResponse } from '../data/plants'

const weekday = new Intl.DateTimeFormat('id-ID', { weekday: 'short' })

function statusOf(code: string | null): LiveStatus | undefined {
  return code === null ? undefined : statusOfApi[code]
}

export function toPlantReadings({ items }: PlantsResponse): PlantReading[] {
  return items.flatMap((item) => {
    const status = statusOf(item.status)
    if (status === undefined || plantIdOf(item.position) === undefined) {
      return []
    }
    return {
      position: item.position,
      status,
      confidence: item.last_observation?.confidence ?? null,
    }
  })
}

/** One bar per day; a window without any counted hole is empty, not seven zero bars. */
export function toDailyConditions({
  items,
}: DailyConditionsResponse): DailyCondition[] {
  const days = items.map((day) => ({
    label: weekday.format(new Date(day.start)),
    ok: day.normal,
    n: day.n_deficiency,
    fe: day.fe_deficiency,
    check: day.needs_check,
  }))
  return days.every((day) => day.ok + day.n + day.fe + day.check === 0)
    ? []
    : days
}

export function toObservations({ items }: ObservationsResponse): Observation[] {
  return items.flatMap((item) => {
    const status = statusOf(item.status)
    if (status === undefined) return []
    return {
      id: item.id,
      observedAt: item.observed_at,
      position: item.plant_position,
      status,
      confidence: item.confidence,
      ph: item.features.ph,
      ec: item.features.ec,
      temperature: item.features.temperature,
    }
  })
}
