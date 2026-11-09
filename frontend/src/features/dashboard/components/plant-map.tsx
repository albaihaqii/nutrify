import { Link } from '@tanstack/react-router'
import { id } from '@/locales/id'
import {
  plantStatusClass,
  plantStatusIcon,
  type PlantStatus,
} from '@/lib/plant-status'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/empty-state'
import { QueryBoundary } from '@/components/query-boundary'
import { StatusBadge } from '@/components/status-badge'
import { usePlantReadings } from '../api/dashboard-queries'
import { type PlantReading } from '../data/plants'

const SUMMARY_STATUSES: PlantStatus[] = ['ok', 'n', 'fe']

function PlantMapSkeleton() {
  return (
    <div aria-hidden='true'>
      <div className='grid grid-cols-3 gap-2.5'>
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className='h-[86px] rounded-[10px]' />
        ))}
      </div>
      <div className='mt-4 grid grid-cols-3 gap-2'>
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className='h-14' />
        ))}
      </div>
    </div>
  )
}

function PlantMapBody({ readings }: { readings: PlantReading[] }) {
  const countOf = (status: PlantStatus) =>
    readings.filter((plant) => plant.status === status).length
  const needCheck = countOf('check')

  return (
    <>
      <div className='grid grid-cols-3 gap-2.5'>
        {readings.map((plant) => {
          const Icon = plantStatusIcon[plant.status]
          return (
            <div
              key={plant.id}
              className={cn(
                'flex min-h-[86px] flex-col gap-0.5 rounded-[10px] p-2.5 text-xs',
                plantStatusClass[plant.status]
              )}
            >
              <b className='flex items-center justify-between text-[13px]'>
                <span>{plant.id}</span>
                <Icon className='size-4' aria-hidden='true' />
              </b>
              <span className='font-semibold'>
                {id.plantStatus[plant.status]}
              </span>
              <span className='tabular-nums'>
                {plant.confidence === null
                  ? '—'
                  : `${Math.round(plant.confidence * 100)}%`}
              </span>
            </div>
          )
        })}
      </div>

      <div className='mt-4 grid grid-cols-3 gap-2 text-center'>
        {SUMMARY_STATUSES.map((status) => (
          <div key={status} className='flex flex-col items-center gap-1'>
            <div className='text-[26px] leading-[1.1] font-bold tracking-[-0.02em] tabular-nums'>
              {countOf(status)}
            </div>
            <StatusBadge tone={status}>{id.plantStatus[status]}</StatusBadge>
          </div>
        ))}
      </div>

      <p className='mt-3 border-t pt-3 text-xs text-muted-foreground'>
        {needCheck > 0 ? (
          <>
            {needCheck} {id.dashboard.plants.noteCount}{' '}
            <strong className='font-semibold'>{id.plantStatus.check}</strong>{' '}
            {id.dashboard.plants.noteReason}
          </>
        ) : (
          id.dashboard.plants.noneToCheck
        )}
      </p>
    </>
  )
}

export function PlantMap() {
  const query = usePlantReadings()

  return (
    <Card className='gap-0 p-5 shadow-none'>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
        <h2 className='text-[15px] font-semibold'>
          {id.dashboard.plants.title}
        </h2>
        <Button asChild variant='outline' className='h-8 px-2.5 text-[13px]'>
          <Link to='/plants'>{id.dashboard.plants.viewAll}</Link>
        </Button>
      </div>

      <QueryBoundary
        query={query}
        skeleton={<PlantMapSkeleton />}
        empty={{
          when: (readings) => readings.length === 0,
          view: <EmptyState title={id.dashboard.plants.empty} />,
        }}
      >
        {(readings) => <PlantMapBody readings={readings} />}
      </QueryBoundary>
    </Card>
  )
}
