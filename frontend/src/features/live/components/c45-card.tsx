import { type UseQueryResult } from '@tanstack/react-query'
import { id } from '@/locales/id'
import { ChevronDown } from 'lucide-react'
import { plantStatusIcon } from '@/lib/plant-status'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/empty-state'
import { QueryBoundary } from '@/components/query-boundary'
import { StatusBadge } from '@/components/status-badge'
import { type LiveAnalysis, type LivePlant } from '../data/live-analysis'

function C45Skeleton() {
  return (
    <div className='flex flex-col gap-3' aria-hidden='true'>
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className='h-8 w-full' />
      ))}
    </div>
  )
}

function C45List({ plants }: { plants: LivePlant[] }) {
  return (
    <>
      <div className='flex flex-col'>
        {plants.map((plant) => {
          const Icon = plantStatusIcon[plant.status]
          return (
            <details key={plant.id} className='group border-b last:border-b-0'>
              <summary className='flex cursor-pointer list-none items-center gap-2 py-2.5 text-[13px] [&::-webkit-details-marker]:hidden'>
                <strong className='w-7 font-semibold'>{plant.id}</strong>
                <StatusBadge
                  tone={plant.status}
                  dashed={plant.status === 'check'}
                >
                  <Icon aria-hidden='true' />
                  {id.plantStatus[plant.status]}
                </StatusBadge>
                <span className='ms-auto tabular-nums'>
                  {plant.confidence === null
                    ? '—'
                    : `${Math.round(plant.confidence * 100)}%`}
                </span>
                <ChevronDown
                  className='size-4 text-muted-foreground transition-transform group-open:rotate-180'
                  aria-hidden='true'
                />
              </summary>
              <div className='mb-2.5 rounded-lg bg-muted px-2.5 py-2 text-xs text-muted-foreground'>
                {plant.rule || id.live.c45.noRule}
              </div>
            </details>
          )
        })}
      </div>
      <p className='mt-1.5 border-t pt-3 text-xs text-muted-foreground'>
        {id.live.c45.note}
      </p>
    </>
  )
}

export function C45Card({ query }: { query: UseQueryResult<LiveAnalysis> }) {
  return (
    <Card className='gap-0 p-5 shadow-none'>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
        <h2 className='text-[15px] font-semibold'>{id.live.c45.title}</h2>
        <span className='text-xs text-muted-foreground'>
          {id.live.c45.badge}
        </span>
      </div>

      <QueryBoundary
        query={query}
        skeleton={<C45Skeleton />}
        empty={{
          when: (analysis) => analysis.plants.length === 0,
          view: <EmptyState title={id.live.c45.empty} />,
        }}
      >
        {(analysis) => <C45List plants={analysis.plants} />}
      </QueryBoundary>
    </Card>
  )
}
