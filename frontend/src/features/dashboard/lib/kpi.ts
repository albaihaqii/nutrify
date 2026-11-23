import {
  metricKeys,
  type IdealRanges,
  type LatestReading,
  type SensorSample,
} from '@/features/sensors/data/sensors'
import { metricMeta } from '@/features/sensors/lib/metrics'
import { type KpiMetric } from '../data/kpis'

const SPARK_POINTS = 12

/** Value range of the ideal bar of each card. */
const SCALES = {
  ph: [4, 8],
  ec: [0.5, 2.5],
  tds: [250, 1250],
  temperature: [10, 35],
} as const

/** Up to `count` values spread evenly over the list, first and last included. */
export function pickSpark(values: number[], count = SPARK_POINTS): number[] {
  if (values.length <= count) return values
  return Array.from(
    { length: count },
    (_, index) =>
      values[Math.round((index * (values.length - 1)) / (count - 1))]
  )
}

/** Range the sparkline is drawn within, never flat so a steady line still shows. */
export function sparkRangeOf(
  values: number[],
  scale: readonly [number, number]
): [number, number] {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = Math.max((max - min) * 0.25, (scale[1] - scale[0]) * 0.02)
  return [min - pad, max + pad]
}

/** The four cards: newest value, change over the last hour, and a sparkline. */
export function buildKpiMetrics(
  latest: LatestReading,
  ideal: IdealRanges,
  lastHour: SensorSample[]
): KpiMetric[] {
  return metricKeys.map((key) => {
    const { decimals } = metricMeta[key]
    const value = latest.values[key]
    const history = lastHour.map((sample) => sample[key])
    const spark = [...pickSpark(history), value]
    const delta = history.length > 0 ? value - history[0] : 0

    return {
      key,
      value,
      decimals,
      delta: Number(delta.toFixed(decimals)),
      spark,
      sparkRange: sparkRangeOf(spark, SCALES[key]),
      scale: [...SCALES[key]],
      ideal: [...ideal[key]],
    }
  })
}
