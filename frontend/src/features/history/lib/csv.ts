import { id } from '@/locales/id'
import { buildCsv } from '@/lib/csv'
import { liveStatusLabel } from '@/features/live/lib/live-status'
import { type ExportRow } from '../data/history'

export function buildObservationCsv(rows: ExportRow[]): string {
  const columns = id.history.table.columns
  return buildCsv(
    [
      columns.time,
      columns.plant,
      columns.status,
      columns.confidence,
      columns.ph,
      columns.ec,
      columns.temperature,
    ],
    rows.map((row) => [
      row.at,
      row.plantId,
      liveStatusLabel(row.status),
      row.confidence === null ? '' : Math.round(row.confidence * 100),
      row.ph ?? '',
      row.ec ?? '',
      row.temperature ?? '',
    ])
  )
}
