export type SensorRange = '1h' | '24h' | '7d'
export const sensorRanges: SensorRange[] = ['1h', '24h', '7d']

export const metricKeys = ['ph', 'ec', 'tds', 'temperature'] as const
export type MetricKey = (typeof metricKeys)[number]

export interface SensorSample {
  /** ISO timestamp of the reading. */
  at: string
  ph: number
  /** mS/cm */
  ec: number
  /** ppm, computed by the backend from EC. */
  tds: number
  /** Water temperature in °C. */
  temperature: number
}

export type IdealRange = [min: number, max: number]
export type IdealRanges = Record<MetricKey, IdealRange>

export interface SensorHistory {
  samples: SensorSample[]
  ideal: IdealRanges
}

export interface SensorRows {
  /** Newest first. */
  rows: SensorSample[]
  /** All rows in the range, not only the ones returned. */
  total: number
  ideal: IdealRanges
}

export const idealRanges: IdealRanges = {
  ph: [5.5, 6.5],
  ec: [1.5, 2.0],
  tds: [750, 1000],
  temperature: [18, 26],
}

export const emptyHistory: SensorHistory = { samples: [], ideal: idealRanges }
export const emptyRows: SensorRows = { rows: [], total: 0, ideal: idealRanges }

const SHAPE: Record<
  SensorRange,
  { count: number; stepMinutes: number; total: number }
> = {
  '1h': { count: 60, stepMinutes: 1, total: 60 },
  '24h': { count: 48, stepMinutes: 30, total: 1440 },
  '7d': { count: 56, stepMinutes: 180, total: 10080 },
}

const round = (value: number, decimals: number) =>
  Number(value.toFixed(decimals))

const wave = (index: number) =>
  Math.sin(index / 6) + 0.3 * Math.cos(index * 1.7)

function sampleAt(index: number, at: string): SensorSample {
  const ec = round(1.75 + 0.09 * wave(index + 3), 3)
  return {
    at,
    ph: round(6.05 + 0.14 * wave(index), 2),
    ec,
    tds: Math.round(ec * 500),
    temperature: round(24.2 + 0.6 * wave(index + 7), 1),
  }
}

const minutesAgo = (now: number, minutes: number) =>
  new Date(now - minutes * 60_000).toISOString()

/** Built on every call so the timestamps stay relative to "now". */
export function buildSensorHistory(
  range: SensorRange,
  now: number = Date.now()
): SensorHistory {
  const { count, stepMinutes } = SHAPE[range]
  const samples = Array.from({ length: count }, (_, index) =>
    sampleAt(index, minutesAgo(now, (count - 1 - index) * stepMinutes))
  )
  return { samples, ideal: idealRanges }
}

export function buildSensorRows(
  range: SensorRange,
  now: number = Date.now()
): SensorRows {
  const rows = Array.from({ length: 8 }, (_, index) =>
    sampleAt(100 - index, minutesAgo(now, index * 5))
  )
  return { rows, total: SHAPE[range].total, ideal: idealRanges }
}
