import { id } from '@/locales/id'
import { buildCsv } from '@/lib/csv'
import { type ObservationRow } from '../data/history'

export function buildObservationCsv(rows: ObservationRow[]): string {
  const columns = id.history.table.columns
  return buildCsv(
    [
      columns.time,
      columns.plant,
      columns.status,
      columns.confidence,
      columns.agreement,
      columns.ph,
      columns.ec,
      columns.temperature,
    ],
    rows.map((row) => [
      row.at,
      row.plantId,
      id.plantStatus[row.status],
      row.confidence === null ? '' : Math.round(row.confidence * 100),
      `${row.agree}/${row.total}`,
      row.ph,
      row.ec,
      row.temperature,
    ])
  )
}
