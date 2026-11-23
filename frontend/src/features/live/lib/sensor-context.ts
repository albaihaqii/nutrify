import {
  metricKeys,
  type IdealRanges,
  type LatestReading,
} from '@/features/sensors/data/sensors'
import { levelOf, metricMeta } from '@/features/sensors/lib/metrics'
import { type SensorContextItem } from '../data/sensor-context'

/** The four sensor values shown beside the webcam, each with its level. */
export function buildSensorContext(
  latest: LatestReading | null,
  ideal: IdealRanges
): SensorContextItem[] {
  if (!latest) return []
  return metricKeys.map((key) => ({
    key,
    value: latest.values[key],
    decimals: metricMeta[key].decimals,
    unit: metricMeta[key].unit,
    level: levelOf(latest.values[key], ideal[key]),
  }))
}
