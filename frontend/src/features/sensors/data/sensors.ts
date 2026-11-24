export type SensorRange = '1h' | '24h' | '7d'
export const sensorRanges: SensorRange[] = ['1h', '24h', '7d']

export const metricKeys = ['ph', 'ec', 'tds', 'temperature'] as const
export type MetricKey = (typeof metricKeys)[number]

export interface SensorSample {
  /** ISO timestamp of the reading (the start of its bucket for charts). */
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
  /** Every row of the range, newest first. */
  rows: SensorSample[]
  ideal: IdealRanges
}

/** What the sensor pages need from the settings (docs/API.md, section 14). */
export interface SensorSettings {
  ideal: IdealRanges
  /** A reading older than this many seconds counts as stale. */
  staleSeconds: number
}

/** The newest reading, as returned by GET /sensor-readings/latest. */
export interface LatestReading {
  /** When the sensor measured it (ms since epoch). */
  recordedAt: number
  isStale: boolean
  values: Record<MetricKey, number>
}
