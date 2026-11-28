import { type Severity } from '@/components/severity-badge'

export type AlertCode =
  | 'sensor_out_of_range'
  | 'plant_deficiency'
  | 'device_offline'
  | 'sensor_stale'

export interface AlertItem {
  id: number
  code: AlertCode
  severity: Severity
  /** What the code needs to be a sentence: the metric, the limits and so on. */
  params: Record<string, unknown>
  /** Hole 1 to 6, or null when the alert is not about a hole. */
  plantPosition: number | null
  /** ISO timestamp. */
  createdAt: string
  /** Someone has marked it as seen. */
  acknowledged: boolean
}

export interface AlertPage {
  rows: AlertItem[]
  /** All open alerts, not only the ones in `rows`. */
  total: number
}

/** `GET /alerts` and `POST /alerts/{id}/acknowledge` (docs/API.md, section 12). */
export interface AlertResponse {
  id: number
  code: AlertCode
  severity: Severity
  params: Record<string, unknown> | null
  plant_position: number | null
  created_at: string
  acknowledged_at: string | null
}

export interface AlertsResponse {
  items: AlertResponse[]
  total: number
}
