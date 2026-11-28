import { type PlantId } from '@/lib/plants'
import { type LiveStatus } from '@/features/live/data/live-analysis'

export const historyRanges = ['today', '7d', '30d'] as const
export type HistoryRange = (typeof historyRanges)[number]

export const statusFilters = [
  'ok',
  'n',
  'fe',
  'check',
  'none',
] as const satisfies readonly LiveStatus[]

export interface ObservationFilters {
  range: HistoryRange
  plant?: PlantId
  status?: LiveStatus
  /** 1-based. */
  page: number
}

export type FilterPatch = Partial<
  Pick<ObservationFilters, 'range' | 'plant' | 'status'>
>

export interface ObservationRow {
  id: number
  /** ISO timestamp of the result. */
  at: string
  plantId: PlantId
  status: LiveStatus
  /** 0 to 1, or null when the model gave no class. */
  confidence: number | null
  /** Null when the sensor had no fresh value at that moment. */
  ph: number | null
  ec: number | null
  temperature: number | null
}

/** A row of the CSV export. */
export type ExportRow = Omit<ObservationRow, 'id'>

export interface ObservationPage {
  rows: ObservationRow[]
  /** All rows matching the filters, not only this page. */
  total: number
  page: number
  pageSize: number
}

/** `GET /observations` (docs/API.md, section 7). */
export interface ObservationsResponse {
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
  page: number
  page_size: number
  total: number
}

/** `GET /observations/export` (docs/API.md, section 7). */
export interface ObservationsExportResponse {
  items: Array<{
    observed_at: string
    plant_position: number
    status: string
    confidence: number | null
    ph: number | null
    ec: number | null
    temperature: number | null
  }>
}
