import { id } from '@/locales/id'
import { ArrowDown, ArrowUp, CircleCheck } from 'lucide-react'
import { formatNumber } from '@/lib/format'
import { formatClock, formatDayTime } from '@/lib/format-time'
import {
  metricKeys,
  type IdealRange,
  type IdealRanges,
  type MetricKey,
  type SensorRange,
  type SensorSample,
} from '../data/sensors'

interface MetricMeta {
  decimals: number
  unit: string
  /** Default axis bounds of the chart. */
  domain: [number, number]
  /** Axis bounds snap outward to a multiple of this when data goes beyond. */
  step: number
  /** Shown as "(dapat diatur)" next to the ideal range. */
  adjustable: boolean
}

export const metricMeta: Record<MetricKey, MetricMeta> = {
  ph: { decimals: 1, unit: '', domain: [5, 7], step: 0.5, adjustable: false },
  ec: {
    decimals: 2,
    unit: 'mS/cm',
    domain: [1, 2.5],
    step: 0.25,
    adjustable: false,
  },
  tds: {
    decimals: 0,
    unit: 'ppm',
    domain: [500, 1250],
    step: 50,
    adjustable: false,
  },
  temperature: {
    decimals: 1,
    unit: '°C',
    domain: [14, 30],
    step: 2,
    adjustable: true,
  },
}

export type Level = 'ideal' | 'low' | 'high'

export function levelOf(value: number, [min, max]: IdealRange): Level {
  if (value < min) return 'low'
  if (value > max) return 'high'
  return 'ideal'
}

export const levelBadge = {
  ideal: { tone: 'ok', icon: CircleCheck },
  low: { tone: 'low', icon: ArrowDown },
  high: { tone: 'high', icon: ArrowUp },
} as const satisfies Record<
  Level,
  { tone: 'ok' | 'low' | 'high'; icon: typeof CircleCheck }
>

export interface SampleIssue {
  metric: MetricKey
  level: 'low' | 'high'
}

/** The metrics of a sample that are outside their ideal range. */
export function issuesOf(
  sample: SensorSample,
  ideal: IdealRanges
): SampleIssue[] {
  return metricKeys.flatMap((metric): SampleIssue[] => {
    const level = levelOf(sample[metric], ideal[metric])
    return level === 'ideal' ? [] : [{ metric, level }]
  })
}

/** Chart axis bounds: the default ones, widened when data goes beyond. */
export function axisBounds(
  metric: MetricKey,
  samples: SensorSample[]
): [number, number] {
  const { domain, step } = metricMeta[metric]
  const values = samples.map((sample) => sample[metric])
  const low = Math.floor(Math.min(...values) / step) * step
  const high = Math.ceil(Math.max(...values) / step) * step
  return [Math.min(domain[0], low), Math.max(domain[1], high)]
}

export function formatIdeal(metric: MetricKey, [min, max]: IdealRange): string {
  const { decimals } = metricMeta[metric]
  return `${formatNumber(min, decimals)}–${formatNumber(max, decimals)}`
}

export function formatSampleTime(range: SensorRange, iso: string): string {
  return range === '7d' ? formatDayTime(iso) : formatClock(iso)
}

export function levelLabel(level: Level): string {
  return id.sensors.level[level]
}
