export type KpiKey = 'ph' | 'ec' | 'tds' | 'temperature'

export type KpiMetric = {
  key: KpiKey
  value: number
  decimals: number
  /** Change versus one hour ago. */
  delta: number
  /** Last readings for the sparkline, oldest first. */
  spark: number[]
  /** Value range the sparkline is drawn within: [min, max]. */
  sparkRange: [number, number]
  /** Value range shown by the ideal bar: [min, max]. */
  scale: [number, number]
  /** Ideal range: [low, high]. */
  ideal: [number, number]
}
