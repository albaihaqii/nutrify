import { id } from '@/locales/id'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/empty-state'
import { QueryBoundary } from '@/components/query-boundary'
import { StatusBadge } from '@/components/status-badge'
import { useModelAccuracies } from '../api/dashboard-queries'
import { type ModelAccuracy } from '../data/models'

function ModelsSkeleton() {
  return (
    <div className='flex flex-col gap-3.5' aria-hidden='true'>
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index}>
          <Skeleton className='mb-1 h-4 w-2/5' />
          <Skeleton className='h-2.5 w-full' />
        </div>
      ))}
    </div>
  )
}

function ModelBars({ models }: { models: ModelAccuracy[] }) {
  return (
    <>
      <div className='flex flex-col gap-3.5'>
        {models.map((model) => {
          const percent =
            model.accuracy === null ? 0 : Math.round(model.accuracy * 100)
          return (
            <div key={model.name}>
              <div className='mb-1 flex items-center justify-between gap-2'>
                <span className='font-medium'>{model.name}</span>
                <span className='tabular-nums'>
                  {model.accuracy === null ? '—' : `${percent}%`}
                </span>
              </div>
              <div
                role='img'
                aria-label={`${model.name}: ${
                  model.accuracy === null
                    ? id.dashboard.models.noData
                    : `${percent}%`
                }`}
                className='relative h-2.5 rounded bg-muted'
              >
                <span
                  className='absolute inset-y-0 left-0 rounded bg-primary'
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <p className='mt-3 border-t pt-3 text-xs text-muted-foreground'>
        {id.dashboard.models.note}
      </p>
    </>
  )
}

export function ModelAccuracyCard() {
  const query = useModelAccuracies()

  return (
    <Card className='gap-0 p-5 shadow-none'>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
        <h2 className='text-[15px] font-semibold'>
          {id.dashboard.models.title}
        </h2>
        <StatusBadge tone='check'>{id.dashboard.models.sample}</StatusBadge>
      </div>

      <QueryBoundary
        query={query}
        skeleton={<ModelsSkeleton />}
        empty={{
          when: (models) => models.length === 0,
          view: <EmptyState title={id.dashboard.models.empty} />,
        }}
      >
        {(models) => <ModelBars models={models} />}
      </QueryBoundary>
    </Card>
  )
}
