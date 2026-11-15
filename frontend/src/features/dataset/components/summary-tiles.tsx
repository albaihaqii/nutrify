import { type ReactNode } from 'react'
import { id } from '@/locales/id'
import { formatNumber } from '@/lib/format'
import { plantStatusIcon } from '@/lib/plant-status'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryBoundary } from '@/components/query-boundary'
import { StatusBadge } from '@/components/status-badge'
import { useDatasetSummary } from '../api/dataset-queries'
import { labelClasses, labelStatus } from '../data/dataset'

const GRID =
  'grid grid-cols-1 gap-4 @xl/content:grid-cols-2 @5xl/content:grid-cols-4'

interface TileProps {
  heading: ReactNode
  value: number
  hint?: string
}

function Tile({ heading, value, hint }: TileProps) {
  return (
    <Card className='gap-0 p-5 shadow-none'>
      <div className='flex h-6 items-center'>{heading}</div>
      <div className='mt-2 text-3xl font-semibold tabular-nums'>
        {formatNumber(value, 0)}
      </div>
      {hint && <div className='mt-1 text-sm text-muted-foreground'>{hint}</div>}
    </Card>
  )
}

function TilesSkeleton() {
  return (
    <div className={GRID} aria-hidden='true'>
      {Array.from({ length: 4 }, (_, index) => (
        <Card key={index} className='gap-0 p-5 shadow-none'>
          <Skeleton className='h-[88px] w-full' />
        </Card>
      ))}
    </div>
  )
}

/** How much data is ready to train on, and how balanced the classes are. */
export function SummaryTiles() {
  const query = useDatasetSummary()

  return (
    <QueryBoundary query={query} skeleton={<TilesSkeleton />}>
      {(summary) => (
        <div className={GRID}>
          <Tile
            heading={
              <span className='text-[13px] font-semibold'>
                {id.dataset.summary.usable}
              </span>
            }
            value={summary.usable}
            hint={id.dataset.summary.usableOf.replace(
              '{n}',
              formatNumber(summary.labeled, 0)
            )}
          />
          {labelClasses.map((labelClass) => {
            const status = labelStatus[labelClass]
            const Icon = plantStatusIcon[status]
            return (
              <Tile
                key={labelClass}
                heading={
                  <StatusBadge tone={status}>
                    <Icon aria-hidden='true' />
                    {id.plantStatus[status]}
                  </StatusBadge>
                }
                value={summary.byClass[labelClass]}
              />
            )
          })}
        </div>
      )}
    </QueryBoundary>
  )
}
