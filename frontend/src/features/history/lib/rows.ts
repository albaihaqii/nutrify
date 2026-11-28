import { statusOfApi } from '@/lib/plant-status'
import { plantIdOf } from '@/lib/plants'
import {
  type ExportRow,
  type ObservationPage,
  type ObservationsExportResponse,
  type ObservationsResponse,
  type ObservationRow,
} from '../data/history'

function toRow(item: ObservationsResponse['items'][number]): ObservationRow[] {
  const plantId = plantIdOf(item.plant_position)
  const status = statusOfApi[item.status]
  if (plantId === undefined || status === undefined) return []
  return [
    {
      id: item.id,
      at: item.observed_at,
      plantId,
      status,
      confidence: item.confidence,
      ph: item.features.ph,
      ec: item.features.ec,
      temperature: item.features.temperature,
    },
  ]
}

export function toObservationPage(
  response: ObservationsResponse
): ObservationPage {
  return {
    rows: response.items.flatMap(toRow),
    total: response.total,
    page: response.page,
    pageSize: response.page_size,
  }
}

export function toExportRows({
  items,
}: ObservationsExportResponse): ExportRow[] {
  return items.flatMap((item) => {
    const plantId = plantIdOf(item.plant_position)
    const status = statusOfApi[item.status]
    if (plantId === undefined || status === undefined) return []
    return {
      at: item.observed_at,
      plantId,
      status,
      confidence: item.confidence,
      ph: item.ph,
      ec: item.ec,
      temperature: item.temperature,
    }
  })
}
