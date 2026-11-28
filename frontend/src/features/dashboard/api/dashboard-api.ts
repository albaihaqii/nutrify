import { api } from '@/lib/api'
import {
  type DailyCondition,
  type DailyConditionsResponse,
} from '../data/daily-conditions'
import {
  type Observation,
  type ObservationsResponse,
} from '../data/observations'
import { type PlantReading, type PlantsResponse } from '../data/plants'
import {
  toDailyConditions,
  toObservations,
  toPlantReadings,
} from '../lib/readings'

/** Days in the daily conditions chart, today included. */
const DAILY_DAYS = 7

/** Rows of the latest observations table: the six holes of the last analysis. */
const LATEST_OBSERVATIONS = 6

export async function fetchPlantReadings(): Promise<PlantReading[]> {
  const { data } = await api.get<PlantsResponse>('/plants')
  return toPlantReadings(data)
}

export async function fetchDailyConditions(): Promise<DailyCondition[]> {
  // Days start at local midnight, so a bar is a day on the viewer's clock.
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - (DAILY_DAYS - 1))

  const { data } = await api.get<DailyConditionsResponse>(
    '/dashboard/daily-conditions',
    { params: { from: start.toISOString(), days: DAILY_DAYS } }
  )
  return toDailyConditions(data)
}

export async function fetchLatestObservations(): Promise<Observation[]> {
  const { data } = await api.get<ObservationsResponse>('/observations', {
    params: { page_size: LATEST_OBSERVATIONS },
  })
  return toObservations(data)
}
