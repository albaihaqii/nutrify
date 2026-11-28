import { type LiveStatus } from '@/features/live/data/live-analysis'

export type PlantReading = {
  /** Hole number, 1 to 6. */
  position: number
  status: LiveStatus
  /** 0 to 1, or null when the model gave no class. */
  confidence: number | null
}

/** `GET /plants` (docs/API.md, section 7). */
export type PlantsResponse = {
  items: Array<{
    position: number
    status: string | null
    last_observation: { confidence: number | null } | null
  }>
}
