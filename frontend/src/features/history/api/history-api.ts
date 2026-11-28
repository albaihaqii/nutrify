import { api } from '@/lib/api'
import { apiStatusOf } from '@/lib/plant-status'
import { plantIds } from '@/lib/plants'
import {
  type ExportRow,
  type ObservationFilters,
  type ObservationPage,
  type ObservationsExportResponse,
  type ObservationsResponse,
} from '../data/history'
import { rangeStart } from '../lib/range'
import { toExportRows, toObservationPage } from '../lib/rows'

const PAGE_SIZE = 10

/** The query parameters every observation request shares (docs/API.md, section 7). */
function filterParams({ range, plant, status }: ObservationFilters) {
  return {
    from: rangeStart(range).toISOString(),
    plant: plant === undefined ? undefined : plantIds.indexOf(plant) + 1,
    status: status === undefined ? undefined : apiStatusOf[status],
  }
}

export async function fetchObservationPage(
  filters: ObservationFilters
): Promise<ObservationPage> {
  const { data } = await api.get<ObservationsResponse>('/observations', {
    params: {
      ...filterParams(filters),
      page: filters.page,
      page_size: PAGE_SIZE,
    },
  })
  return toObservationPage(data)
}

/** Every row matching the filters (all pages), for the CSV export. */
export async function fetchObservationExport(
  filters: ObservationFilters
): Promise<ExportRow[]> {
  const { data } = await api.get<ObservationsExportResponse>(
    '/observations/export',
    { params: filterParams(filters) }
  )
  return toExportRows(data)
}
