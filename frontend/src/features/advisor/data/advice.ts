import { type PlantId } from '@/lib/plants'
import { type Severity } from '@/components/severity-badge'
import { type HistoryRange } from '@/features/history/data/history'

const adviceSources = ['llm', 'rules'] as const
export type AdviceSource = (typeof adviceSources)[number]

export const sourceFilters = ['all', ...adviceSources] as const
export type SourceFilter = (typeof sourceFilters)[number]

export const ADVICE_PAGE_SIZE = 10

export interface AdviceFilters {
  source: SourceFilter
  plant?: PlantId
  /** Only advice made in this range; leave out for all of it. */
  range?: HistoryRange
  /** 1-based. */
  page: number
}

export type AdviceFilterPatch = Partial<Pick<AdviceFilters, 'source' | 'plant'>>

export interface AdviceItem {
  id: number
  /** ISO timestamp. */
  createdAt: string
  /** Hole 1 to 6, or null for advice about the tank as a whole. */
  plantPosition: number | null
  severity: Severity
  summary: string
  likelyCauses: string[]
  suggestedActions: string[]
  source: AdviceSource
  /** The LLM that wrote the advice; null for the rules. */
  modelName: string | null
}

export interface AdvicePage {
  rows: AdviceItem[]
  /** All advice matching the filters, not only this page. */
  total: number
  page: number
  pageSize: number
}

export type RuleCode =
  | 'n_deficiency_in_range'
  | 'fe_deficiency'
  | 'ph_out_of_range'
  | 'ec_out_of_range'
  | 'temperature_out_of_range'
  | 'needs_check'

/** One fallback rule. The condition is fixed in the backend; only the actions can be edited. */
export interface FallbackRule {
  code: RuleCode
  suggestedActions: string[]
}

/** `GET /advice` (docs/API.md, section 11). */
export interface AdviceResponse {
  id: number
  created_at: string
  plant_position: number | null
  severity: Severity
  summary: string
  likely_causes: string[]
  suggested_actions: string[]
  source: AdviceSource
  model_name: string | null
}

export interface AdvicePageResponse {
  items: AdviceResponse[]
  page: number
  page_size: number
  total: number
}

/** `GET /advice/rules` and `PUT /advice/rules/{code}`. */
export interface RuleResponse {
  code: RuleCode
  suggested_actions: string[]
}

export interface RulesResponse {
  items: RuleResponse[]
}
