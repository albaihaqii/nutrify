import { id } from '@/locales/id'
import {
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatNumber } from '@/lib/format'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/status-badge'
import {
  type IdealRange,
  type MetricKey,
  type SensorRange,
  type SensorSample,
} from '../data/sensors'
import {
  axisBounds,
  formatIdeal,
  formatSampleTime,
  levelBadge,
  levelLabel,
  levelOf,
  metricMeta,
} from '../lib/metrics'

const AXIS_TICK = { fontSize: 11, fill: 'var(--muted-foreground)' }

interface MetricTooltipProps {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: SensorSample }>
  metric: MetricKey
  range: SensorRange
}

function MetricTooltip({ active, payload, metric, range }: MetricTooltipProps) {
  const sample = payload?.[0]?.payload
  if (!active || !sample) return null
  const { decimals, unit } = metricMeta[metric]

  return (
    <div className='rounded-lg border bg-card px-3 py-2 text-xs shadow-md'>
      <div className='mb-1 font-semibold'>
        {formatSampleTime(range, sample.at)}
      </div>
      <div className='flex items-center gap-2'>
        <span aria-hidden='true' className='h-0.5 w-3 bg-primary' />
        {id.sensors.metrics[metric].short}
        <span className='ms-auto font-medium tabular-nums'>
          {formatNumber(sample[metric], decimals)} {unit}
        </span>
      </div>
    </div>
  )
}

interface MetricChartCardProps {
  metric: MetricKey
  samples: SensorSample[]
  ideal: IdealRange
  range: SensorRange
}

export function MetricChartCard({
  metric,
  samples,
  ideal,
  range,
}: MetricChartCardProps) {
  const meta = metricMeta[metric]
  const latest = samples[samples.length - 1]
  const first = samples[0]
  const middle = samples[Math.floor(samples.length / 2)]
  if (!latest || !first || !middle) return null

  const level = levelOf(latest[metric], ideal)
  const badge = levelBadge[level]
  const BadgeIcon = badge.icon
  const [low, high] = axisBounds(metric, samples)
  const allIdeal = samples.every(
    (sample) => levelOf(sample[metric], ideal) === 'ideal'
  )
  const title = id.sensors.metrics[metric].title
  const ariaLabel = `${id.sensors.chart.ariaPrefix} ${title} ${id.sensors.ranges[range]}, ${
    allIdeal ? id.sensors.chart.ariaAllIdeal : id.sensors.chart.ariaOutside
  }`

  return (
    <Card className='gap-0 p-5 shadow-none'>
      <div className='mb-2 flex flex-wrap items-center justify-between gap-3'>
        <h2 className='text-[15px] font-semibold'>{title}</h2>
        <StatusBadge tone={badge.tone}>
          <BadgeIcon aria-hidden='true' />
          {levelLabel(level)} · {formatNumber(latest[metric], meta.decimals)}
        </StatusBadge>
      </div>

      <div role='img' aria-label={ariaLabel}>
        <ResponsiveContainer width='100%' height={200}>
          <LineChart
            data={samples}
            margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
          >
            <ReferenceArea
              y1={ideal[0]}
              y2={ideal[1]}
              fill='var(--chart-1)'
              fillOpacity={0.16}
              stroke='none'
            />
            <ReferenceLine y={low} stroke='var(--border)' />
            <XAxis
              dataKey='at'
              ticks={[first.at, middle.at, latest.at]}
              interval={0}
              tickFormatter={(value: string) =>
                value === latest.at
                  ? id.sensors.now
                  : formatSampleTime(range, value)
              }
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              padding={{ left: 12, right: 12 }}
            />
            <YAxis
              domain={[low, high]}
              ticks={[low, high]}
              tickFormatter={(value: number) =>
                formatNumber(value, meta.decimals)
              }
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <Tooltip
              content={<MetricTooltip metric={metric} range={range} />}
            />
            <Line
              dataKey={metric}
              stroke='var(--primary)'
              strokeWidth={2.5}
              strokeLinejoin='round'
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className='mt-1 flex flex-wrap gap-x-3.5 gap-y-1.5 text-xs text-muted-foreground'>
        <span className='inline-flex items-center gap-1.5'>
          <span
            aria-hidden='true'
            className='size-2.5 rounded-[3px] bg-chart-1 opacity-35'
          />
          {id.sensors.chart.idealRange} {formatIdeal(metric, ideal)}
          {meta.adjustable && ` ${id.sensors.chart.adjustable}`}
        </span>
      </div>
    </Card>
  )
}
