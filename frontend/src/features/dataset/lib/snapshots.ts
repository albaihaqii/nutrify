import { plantIdOf } from '@/lib/plants'
import {
  qcStatuses,
  type DatasetSummary,
  type DatasetSummaryResponse,
  type QcStatus,
  type Snapshot,
  type SnapshotPage,
  type SnapshotsResponse,
} from '../data/dataset'

type Item = SnapshotsResponse['items'][number]

/**
 * A result stored as `ok` without sensor values is shown as "Sensor kosong": the leaf is fine,
 * but the row cannot be used for training (docs/API.md, section 8).
 */
function qcOf({ qc_status: status, features }: Item): QcStatus | undefined {
  const known = qcStatuses.find((qc) => qc === status)
  const complete = [features.ph, features.ec, features.temperature].every(
    (value) => value !== null
  )
  return known === 'ok' && !complete ? 'stale_sensor' : known
}

function toSnapshot(item: Item): Snapshot[] {
  const plantId = plantIdOf(item.plant_position)
  const qc = qcOf(item)
  if (plantId === undefined || qc === undefined) return []
  return [
    {
      id: item.id,
      plantId,
      at: item.observed_at,
      ph: item.features.ph,
      ec: item.features.ec,
      temperature: item.features.temperature,
      qc,
      label: item.label_class,
    },
  ]
}

export function toSnapshotPage(response: SnapshotsResponse): SnapshotPage {
  return {
    rows: response.items.flatMap(toSnapshot),
    total: response.total,
    page: response.page,
    pageSize: response.page_size,
  }
}

export function toDatasetSummary(
  response: DatasetSummaryResponse
): DatasetSummary {
  return {
    labeled: response.labeled,
    usable: response.usable,
    byClass: response.by_class,
  }
}
