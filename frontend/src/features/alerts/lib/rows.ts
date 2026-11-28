import {
  type AlertItem,
  type AlertPage,
  type AlertResponse,
  type AlertsResponse,
} from '../data/alerts'

export function toAlertItem(item: AlertResponse): AlertItem {
  return {
    id: item.id,
    code: item.code,
    severity: item.severity,
    params: item.params ?? {},
    plantPosition: item.plant_position,
    createdAt: item.created_at,
    acknowledged: item.acknowledged_at !== null,
  }
}

export function toAlertPage(response: AlertsResponse): AlertPage {
  return { rows: response.items.map(toAlertItem), total: response.total }
}
