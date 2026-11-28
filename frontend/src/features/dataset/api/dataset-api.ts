import { api } from '@/lib/api'
import { apiStatusOf } from '@/lib/plant-status'
import { plantIds } from '@/lib/plants'
import {
  type CaptureResponse,
  type DatasetSummary,
  type DatasetSummaryResponse,
  type LabelClass,
  type SnapshotFilters,
  type SnapshotPage,
  type SnapshotsResponse,
} from '../data/dataset'
import { toDatasetSummary, toSnapshotPage } from '../lib/snapshots'

const PAGE_SIZE = 8

export async function fetchDatasetSummary(): Promise<DatasetSummary> {
  const { data } = await api.get<DatasetSummaryResponse>('/dataset/summary')
  return toDatasetSummary(data)
}

export async function fetchSnapshotPage({
  label,
  plant,
  status,
  page,
}: SnapshotFilters): Promise<SnapshotPage> {
  const { data } = await api.get<SnapshotsResponse>('/observations', {
    params: {
      labelable: true,
      label: label === 'all' ? undefined : label,
      plant: plant === undefined ? undefined : plantIds.indexOf(plant) + 1,
      status: status === undefined ? undefined : apiStatusOf[status],
      page,
      page_size: PAGE_SIZE,
    },
  })
  return toSnapshotPage(data)
}

/** Setting `label` to null clears it. */
export async function saveLabel(
  observationId: number,
  label: LabelClass | null
): Promise<void> {
  await api.patch(`/observations/${observationId}/label`, {
    label_class: label,
  })
}

/** The CSV text, ready to download. */
export async function fetchDatasetCsv(): Promise<string> {
  const { data } = await api.get<string>('/dataset/export', {
    responseType: 'text',
    transformResponse: (body: string) => body,
  })
  return data
}

/** Stores the current camera frame and its results for labelling. */
export async function captureSnapshot(): Promise<CaptureResponse> {
  const { data } = await api.post<CaptureResponse>('/camera/captures')
  return data
}
