import { type PlantStatus } from '@/lib/plant-status'
import { type PlantId } from '@/lib/plants'

export const labelClasses = ['normal', 'n_deficiency', 'fe_deficiency'] as const
export type LabelClass = (typeof labelClasses)[number]

/** The status badge each label is drawn with (same colours as the rest of the app). */
export const labelStatus: Record<LabelClass, PlantStatus> = {
  normal: 'ok',
  n_deficiency: 'n',
  fe_deficiency: 'fe',
}

export const labelFilters = ['unlabeled', 'labeled', 'all'] as const
export type LabelFilter = (typeof labelFilters)[number]

/** Quality of a result; an empty hole is never offered for labelling. */
export const qcStatuses = [
  'ok',
  'invalid_leaf',
  'stale_sensor',
  'needs_check',
] as const
export type QcStatus = (typeof qcStatuses)[number]

/** What the model said about the hole, as a filter. */
export const statusFilters = [
  'ok',
  'n',
  'fe',
  'check',
] as const satisfies readonly PlantStatus[]

export interface SnapshotFilters {
  label: LabelFilter
  plant?: PlantId
  status?: PlantStatus
  /** 1-based. */
  page: number
}

export type SnapshotFilterPatch = Partial<
  Pick<SnapshotFilters, 'label' | 'plant' | 'status'>
>

/** One hole of a stored snapshot, waiting for a label or already labelled. */
export interface Snapshot {
  id: number
  plantId: PlantId
  /** ISO timestamp. */
  at: string
  /** Sensor values stored with the snapshot; null when they were not stored. */
  ph: number | null
  ec: number | null
  temperature: number | null
  qc: QcStatus
  label: LabelClass | null
}

export interface SnapshotPage {
  rows: Snapshot[]
  /** All snapshots matching the filters, not only this page. */
  total: number
  page: number
  pageSize: number
}

export interface DatasetSummary {
  /** Labeled by hand, whatever their quality. */
  labeled: number
  /** Labeled and complete: exactly the rows the export contains. */
  usable: number
  /** Usable rows per class. */
  byClass: Record<LabelClass, number>
}

/** `GET /observations` as the Dataset page asks for it (docs/API.md, section 7). */
export interface SnapshotsResponse {
  items: Array<{
    id: number
    plant_position: number
    observed_at: string
    qc_status: string
    label_class: LabelClass | null
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

/** `GET /dataset/summary` (docs/API.md, section 8). */
export interface DatasetSummaryResponse {
  labeled: number
  usable: number
  by_class: Record<LabelClass, number>
}

/** `POST /camera/captures` (docs/API.md, section 9). */
export interface CaptureResponse {
  id: number
  captured_at: string
  observations: number
}
