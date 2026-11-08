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

// Dummy data until the sensor API exists.
export const kpiMetrics: KpiMetric[] = [
  {
    key: 'ph',
    value: 6.1,
    decimals: 1,
    delta: 0.1,
    spark: [5.9, 6, 6, 6.05, 6.0, 6.1],
    sparkRange: [5.6, 6.4],
    scale: [4, 8],
    ideal: [5.5, 6.5],
  },
  {
    key: 'ec',
    value: 1.72,
    decimals: 2,
    delta: -0.03,
    spark: [1.78, 1.76, 1.75, 1.74, 1.73, 1.72],
    sparkRange: [1.6, 1.9],
    scale: [0.5, 2.5],
    ideal: [1.5, 2.0],
  },
  {
    key: 'tds',
    value: 860,
    decimals: 0,
    delta: -15,
    spark: [890, 882, 876, 870, 865, 860],
    sparkRange: [800, 920],
    scale: [250, 1250],
    ideal: [750, 1000],
  },
  {
    key: 'temperature',
    value: 24.6,
    decimals: 1,
    delta: 0.3,
    spark: [24.0, 24.1, 24.2, 24.3, 24.5, 24.6],
    sparkRange: [23.5, 25],
    scale: [10, 35],
    ideal: [18, 26],
  },
]
