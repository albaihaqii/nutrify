import { Link } from '@tanstack/react-router'
import { id } from '@/locales/id'
import { ArrowDown, ArrowUp, CircleCheck } from 'lucide-react'
import { formatNumber } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/empty-state'
import { QueryBoundary } from '@/components/query-boundary'
import { StatusBadge } from '@/components/status-badge'
import { useSensorContext } from '../api/live-queries'
import {
  type SensorContextItem,
  type SensorLevel,
} from '../data/sensor-context'

const levelBadge = {
  ideal: { tone: 'ok', icon: CircleCheck },
  low: { tone: 'low', icon: ArrowDown },
  high: { tone: 'high', icon: ArrowUp },
} as const satisfies Record<
  SensorLevel,
  { tone: 'ok' | 'low' | 'high'; icon: typeof CircleCheck }
>

const GRID = 'grid grid-cols-2 gap-3 @xl/content:grid-cols-4'

function ContextSkeleton() {
  return (
    <div className={GRID} aria-hidden='true'>
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className='h-[96px] rounded-[10px]' />
      ))}
    </div>
  )
}

function ContextGrid({ items }: { items: SensorContextItem[] }) {
  return (
    <div className={GRID}>
      {items.map((item) => {
        const badge = levelBadge[item.level]
        const Icon = badge.icon
        return (
          <div key={item.key} className='rounded-[10px] border p-3'>
            <div className='text-xs font-semibold text-muted-foreground'>
              {id.live.context.labels[item.key]}
            </div>
            <div className='text-[22px] font-bold tabular-nums'>
              {formatNumber(item.value, item.decimals)}
              {item.unit && (
                <span className='ms-1.5 text-xs font-medium text-muted-foreground'>
                  {item.unit}
                </span>
              )}
            </div>
            <StatusBadge tone={badge.tone} className='mt-1'>
              <Icon aria-hidden='true' />
              {id.live.context.status[item.level]}
            </StatusBadge>
          </div>
        )
      })}
    </div>
  )
}

export function SensorContextCard() {
  const query = useSensorContext()

  return (
    <Card className='gap-0 p-5 shadow-none'>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
        <h2 className='text-[15px] font-semibold'>{id.live.context.title}</h2>
        <Button asChild variant='outline' className='h-8 px-2.5 text-[13px]'>
          <Link to='/sensors'>{id.live.context.detail}</Link>
        </Button>
      </div>

      <QueryBoundary
        query={query}
        skeleton={<ContextSkeleton />}
        empty={{
          when: (items) => items.length === 0,
          view: <EmptyState title={id.live.context.empty} />,
        }}
      >
        {(items) => <ContextGrid items={items} />}
      </QueryBoundary>
    </Card>
  )
}
