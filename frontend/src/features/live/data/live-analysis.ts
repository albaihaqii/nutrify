import { type PlantStatus } from '@/lib/plant-status'

/** The four plant statuses plus the one only the live view has: nothing green in the region. */
export type LiveStatus = PlantStatus | 'none'

export interface LivePlant {
  /** Hole number, 1 to 6. */
  position: number
  status: LiveStatus
  /** 0 to 1, or null when the model has no answer. */
  confidence: number | null
  /** Decision path of the C4.5 tree for this plant, or why there is none. */
  rule: string
}

export interface ComparatorResult {
  /** Model id from the registry, for example `svm`. */
  modelId: string
  agree: number
  total: number
}

export interface LiveAnalysis {
  /** When the worker made this analysis; null while there is none. */
  analyzedAt: Date | null
  plants: LivePlant[]
  comparators: ComparatorResult[]
}

/** `GET /camera/analysis` (docs/API.md, section 8). */
export interface AnalysisResponse {
  analyzed_at: string | null
  plants: Array<{
    position: number
    status: string | null
    confidence: number | null
    observed: string
    predicted: string | null
    rule_path: Array<{ feature: string; operator: string; threshold: number }>
    comparators: Array<{ model_id: string; label: string }>
  }>
}
