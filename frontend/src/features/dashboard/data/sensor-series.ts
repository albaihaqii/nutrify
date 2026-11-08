import { id } from '@/locales/id'

export type ChartRange = '1h' | '24h' | '7d'

export type SensorPoint = { label: string; ph: number; ec: number }

export type SensorSeries = { points: SensorPoint[]; ticks: string[] }

export const chartRanges: ChartRange[] = ['1h', '24h', '7d']

export const idealRanges = {
  ph: [5.5, 6.5],
  ec: [1.5, 2.0],
} as const

const pad = (value: number) => String(value).padStart(2, '0')
const phAt = (i: number) => 6.05 + 0.16 * Math.sin(i / 3.2) + 0.04 * Math.cos(i)
const ecAt = (i: number) =>
  1.78 + 0.1 * Math.cos(i / 4) - 0.03 * Math.sin(i * 1.3)

const { now, today, minutes } = id.dashboard.chart

function buildLastHour(): SensorSeries {
  const points = Array.from({ length: 13 }, (_, i) => ({
    label: i === 12 ? now : `-${(12 - i) * 5} ${minutes}`,
    ph: phAt(i + 30),
    ec: ecAt(i + 30),
  }))
  return { points, ticks: [0, 3, 6, 9, 12].map((i) => points[i].label) }
}

function buildLastDay(): SensorSeries {
  const points = Array.from({ length: 24 }, (_, i) => ({
    label: i === 23 ? now : `${pad(i)}:00`,
    ph: phAt(i),
    ec: ecAt(i),
  }))
  return { points, ticks: [0, 6, 12, 18, 23].map((i) => points[i].label) }
}

function buildLastWeek(): SensorSeries {
  const weekday = new Intl.DateTimeFormat('id-ID', { weekday: 'short' })
  const points = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    return {
      label: i === 6 ? today : weekday.format(date),
      ph: phAt(i * 3 + 5),
      ec: ecAt(i * 3 + 5),
    }
  })
  return { points, ticks: points.map((point) => point.label) }
}

// Dummy data until the sensor history API exists.
export const sensorSeries: Record<ChartRange, SensorSeries> = {
  '1h': buildLastHour(),
  '24h': buildLastDay(),
  '7d': buildLastWeek(),
}
