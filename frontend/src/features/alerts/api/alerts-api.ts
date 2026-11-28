import { api } from '@/lib/api'
import {
  type AlertItem,
  type AlertPage,
  type AlertResponse,
  type AlertsResponse,
} from '../data/alerts'
import { toAlertItem, toAlertPage } from '../lib/rows'

/** The newest open alerts. The API checks the conditions again on every request. */
export async function fetchOpenAlerts(pageSize: number): Promise<AlertPage> {
  const { data } = await api.get<AlertsResponse>('/alerts', {
    params: { state: 'open', page_size: pageSize },
  })
  return toAlertPage(data)
}

export async function acknowledgeAlert(alertId: number): Promise<AlertItem> {
  const { data } = await api.post<AlertResponse>(
    `/alerts/${alertId}/acknowledge`
  )
  return toAlertItem(data)
}
