import { id } from '@/locales/id'
import { ArrowDown, ArrowUp, CircleCheck, TriangleAlert } from 'lucide-react'
import { formatDelta, formatNumber } from '@/lib/format'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/status-badge'
import { type KpiMetric } from '../data/kpis'
import { Sparkline } from './sparkline'

const percent = (value: number, [min, max]: [number, number]) =>
  Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))

function getRangeStatus(value: number, [low, high]: [number, number]) {
  if (value < low) return 'low' as const
  if (value > high) return 'high' as const
  return 'ideal' as const
}

const badges = {
  ideal: { tone: 'ok', icon: CircleCheck },
  low: { tone: 'low', icon: ArrowDown },
  high: { tone: 'high', icon: TriangleAlert },
} as const

export function KpiCard({ metric }: { metric: KpiMetric }) {
  const text = id.dashboard.kpi.metrics[metric.key]
  const status = getRangeStatus(metric.value, metric.ideal)
  const badge = badges[status]
  const BadgeIcon = badge.icon
  const DeltaIcon = metric.delta < 0 ? ArrowDown : ArrowUp

  const zoneStart = percent(metric.ideal[0], metric.scale)
  const zoneEnd = percent(metric.ideal[1], metric.scale)
  const valueText = formatNumber(metric.value, metric.decimals)

  return (
    <Card className='gap-2.5 p-5 shadow-none'>
      <div className='flex items-center justify-between gap-2'>
        <span className='text-[13px] font-semibold text-muted-foreground'>
          {text.label}
        </span>
        <StatusBadge tone={badge.tone}>
          <BadgeIcon aria-hidden='true' />
          {id.dashboard.kpi.status[status]}
        </StatusBadge>
      </div>

      <div className='text-[34px] leading-[1.1] font-bold tracking-[-0.02em] tabular-nums'>
        {valueText}
        {text.unit && (
          <span className='ml-1.5 text-sm font-medium tracking-normal text-muted-foreground'>
            {text.unit}
          </span>
        )}
      </div>

      <div className='flex items-center justify-between gap-2'>
        <span className='inline-flex items-center gap-1 text-xs font-medium tabular-nums'>
          <DeltaIcon className='size-3' aria-hidden='true' />
          {formatDelta(metric.delta, metric.decimals)}{' '}
          <span className='text-muted-foreground'>
            {id.dashboard.kpi.vsLastHour}
          </span>
        </span>
        <Sparkline values={metric.spark} range={metric.sparkRange} />
      </div>

      <div
        role='img'
        aria-label={`${text.label} ${valueText} ${text.unit}. ${id.dashboard.kpi.idealRange} ${text.ideal}`}
        className='relative h-2 rounded bg-muted'
      >
        <span
          className='absolute inset-y-0 rounded bg-chart-1 opacity-35'
          style={{
            left: `${zoneStart}%`,
            width: `${zoneEnd - zoneStart}%`,
          }}
        />
        <span
          className='absolute -top-[3px] h-3.5 w-1 -translate-x-1/2 rounded-sm bg-foreground'
          style={{ left: `${percent(metric.value, metric.scale)}%` }}
        />
      </div>

      <div className='text-[11px] text-muted-foreground'>
        {id.dashboard.kpi.idealPrefix} {text.ideal}
      </div>
    </Card>
  )
}
