import { type PlantId } from '@/lib/plants'
import { type RuleStep } from '@/lib/rule-path'
import { type LiveStatus } from '@/features/live/data/live-analysis'

export interface PlantSummary {
  id: PlantId
  status: LiveStatus
  /** 0 to 1, or null when the model gave no class. */
  confidence: number | null
  /** ISO timestamp of the last stored result of this plant. */
  updatedAt: string
  /** The result the picture of the card comes from. */
  observationId: number
}

export interface StatusEntry {
  /** ISO timestamp the plant got this status. */
  at: string
  status: LiveStatus
  confidence: number | null
}

export interface MeanRgb {
  r: number
  g: number
  b: number
}

export interface PlantDetail extends PlantSummary {
  /** Whether a snapshot was stored with the latest result. */
  hasImage: boolean
  /** Average leaf color from segmentation, null when there was no leaf. */
  mean: MeanRgb | null
  /** Decision path of the C4.5 tree, one condition per item. */
  path: string[]
  /** Newest first. */
  history: StatusEntry[]
}

/** `GET /plants` (docs/API.md, section 7). */
export interface PlantsResponse {
  items: Array<{
    position: number
    status: string | null
    last_observation: {
      id: number
      observed_at: string
      confidence: number | null
    } | null
  }>
}

/** `GET /plants/{position}` (docs/API.md, section 7). */
export interface PlantDetailResponse {
  position: number
  status: string
  latest_observation: {
    id: number
    observed_at: string
    confidence: number | null
    has_image: boolean
    rule_path: RuleStep[] | null
    features: {
      mean_r: number | null
      mean_g: number | null
      mean_b: number | null
    }
  }
  status_history: Array<{
    since: string
    status: string
    confidence: number | null
  }>
}
