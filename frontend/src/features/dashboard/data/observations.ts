import { type LiveStatus } from '@/features/live/data/live-analysis'

export type Observation = {
  id: number
  /** ISO time of the result. */
  observedAt: string
  /** Hole number, 1 to 6. */
  position: number
  status: LiveStatus
  /** 0 to 1, or null when the model gave no class. */
  confidence: number | null
  /** Null when the sensor had no fresh value at that moment. */
  ph: number | null
  ec: number | null
  temperature: number | null
}

/** `GET /observations` (docs/API.md, section 7). */
export type ObservationsResponse = {
  items: Array<{
    id: number
    plant_position: number
    observed_at: string
    status: string
    confidence: number | null
    features: {
      ph: number | null
      ec: number | null
      temperature: number | null
    }
  }>
}
