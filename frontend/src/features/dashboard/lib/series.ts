import { formatClock, formatDayTime } from '@/lib/format-time'
import { type SensorHistory } from '@/features/sensors/data/sensors'
import { type ChartRange, type SensorSeries } from '../data/sensor-series'

const TICK_COUNT = 5

/** Up to `count` labels spread evenly over the series, first and last included. */
export function pickTicks(labels: string[], count = TICK_COUNT): string[] {
  if (labels.length <= count) return [...new Set(labels)]
  const picked = Array.from(
    { length: count },
    (_, index) =>
      labels[Math.round((index * (labels.length - 1)) / (count - 1))]
  )
  return [...new Set(picked)]
}

/** The chart series of a range, built from the shared sensor history. */
export function toSeries(
  range: ChartRange,
  history: SensorHistory
): SensorSeries {
  const label = range === '7d' ? formatDayTime : formatClock
  const points = history.samples.map((sample) => ({
    label: label(sample.at),
    ph: sample.ph,
    ec: sample.ec,
  }))
  return {
    points,
    ticks: pickTicks(points.map((point) => point.label)),
    ideal: { ph: history.ideal.ph, ec: history.ideal.ec },
  }
}
