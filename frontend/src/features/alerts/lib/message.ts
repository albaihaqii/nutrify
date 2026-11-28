import { id } from '@/locales/id'
import { formatNumber } from '@/lib/format'
import { plantIdOf } from '@/lib/plants'
import { type AlertItem } from '../data/alerts'

const text = id.alerts.messages

const METRICS = {
  ph: { label: text.metrics.ph, decimals: 1, unit: '' },
  ec: { label: text.metrics.ec, decimals: 2, unit: ' mS/cm' },
  temperature: { label: text.metrics.temperature, decimals: 1, unit: ' °C' },
} as const

type MetricKey = keyof typeof METRICS

const isMetric = (value: unknown): value is MetricKey =>
  typeof value === 'string' && value in METRICS

const PLANT_STATUS = {
  n_deficiency: id.plantStatus.n,
  fe_deficiency: id.plantStatus.fe,
} as const

/** "pH 7,1 di atas rentang ideal 5,5 sampai 6,5". */
function sensorOutOfRange(params: AlertItem['params']): string {
  const { metric, value, min, max, side } = params
  if (
    !isMetric(metric) ||
    typeof value !== 'number' ||
    typeof min !== 'number' ||
    typeof max !== 'number'
  ) {
    return text.fallback
  }
  const { label, decimals, unit } = METRICS[metric]
  const number = (n: number) => formatNumber(n, decimals)
  return text.sensorOutOfRange
    .replace('{metric}', label)
    .replace('{value}', `${number(value)}${unit}`)
    .replace('{side}', side === 'low' ? text.below : text.above)
    .replace('{min}', number(min))
    .replace('{max}', `${number(max)}${unit}`)
}

function plantDeficiency(alert: AlertItem): string {
  const status = alert.params.status
  const plant =
    alert.plantPosition === null ? undefined : plantIdOf(alert.plantPosition)
  if (
    plant === undefined ||
    (status !== 'n_deficiency' && status !== 'fe_deficiency')
  ) {
    return text.fallback
  }
  return text.plantDeficiency
    .replace('{plant}', plant)
    .replace('{status}', PLANT_STATUS[status])
}

function sensorStale(params: AlertItem['params']): string {
  const seconds = params.stale_seconds
  if (typeof seconds !== 'number') return text.sensorStaleNoLimit
  const minutes = Math.max(1, Math.round(seconds / 60))
  return text.sensorStale.replace('{minutes}', String(minutes))
}

/** The alert as a sentence. The API sends a code and its numbers; the words are ours. */
export function alertMessage(alert: AlertItem): string {
  switch (alert.code) {
    case 'sensor_out_of_range':
      return sensorOutOfRange(alert.params)
    case 'plant_deficiency':
      return plantDeficiency(alert)
    case 'device_offline':
      return text.deviceOffline
    case 'sensor_stale':
      return sensorStale(alert.params)
  }
}
