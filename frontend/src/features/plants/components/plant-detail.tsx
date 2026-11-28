import { type ReactNode } from 'react'
import { id } from '@/locales/id'
import { X } from 'lucide-react'
import { formatConfidence } from '@/lib/confidence'
import { formatNumber } from '@/lib/format'
import { formatDayTime } from '@/lib/format-time'
import { type PlantId } from '@/lib/plants'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/empty-state'
import { PlantStatusBadge } from '@/components/plant-status-badge'
import { QueryBoundary } from '@/components/query-boundary'
import { usePlantDetail } from '../api/plants-queries'
import { type PlantDetail } from '../data/plants'
import { ObservationImage } from './observation-image'

const copy = id.plants.detail
const PICTURE = 'size-full rounded-xl'

function Figure({
  caption,
  children,
}: {
  caption: string
  children: ReactNode
}) {
  return (
    <figure className='m-0'>
      <div className='flex h-[200px] items-center justify-center rounded-xl bg-[#18241E] dark:bg-[#0A100D]'>
        {children}
      </div>
      <figcaption className='mt-1.5 text-xs text-muted-foreground'>
        {caption}
      </figcaption>
    </figure>
  )
}

function DetailSkeleton() {
  return (
    <div className='grid gap-6 @5xl/content:grid-cols-2' aria-hidden='true'>
      <div className='flex flex-col gap-5'>
        <div className='grid gap-4 @xl/content:grid-cols-2'>
          <Skeleton className='h-[200px] rounded-xl' />
          <Skeleton className='h-[200px] rounded-xl' />
        </div>
        <Skeleton className='h-[110px]' />
      </div>
      <div className='flex flex-col gap-5'>
        <Skeleton className='h-[150px]' />
        <Skeleton className='h-[200px]' />
      </div>
    </div>
  )
}

function DetailBody({ detail }: { detail: PlantDetail }) {
  const { mean } = detail
  const imageId = detail.hasImage ? detail.observationId : null
  const meanItems = mean
    ? [
        { key: 'r', label: copy.mean.r, value: mean.r },
        { key: 'g', label: copy.mean.g, value: mean.g },
        { key: 'b', label: copy.mean.b, value: mean.b },
      ]
    : []

  return (
    <div className='grid gap-6 @5xl/content:grid-cols-2'>
      <div className='flex min-w-0 flex-col gap-5'>
        <div className='grid gap-4 @xl/content:grid-cols-2'>
          <Figure caption={copy.photo}>
            <ObservationImage
              observationId={imageId}
              view='photo'
              label={`${copy.photo} ${detail.id}`}
              className={PICTURE}
            />
          </Figure>
          <Figure caption={copy.segmentation}>
            <ObservationImage
              observationId={imageId}
              view='segmentation'
              label={`${copy.segmentation} ${detail.id}`}
              className={PICTURE}
            />
          </Figure>
        </div>

        <section>
          <h3 className='mb-2.5 text-sm font-semibold'>{copy.meanTitle}</h3>
          {mean ? (
            <>
              <div className='grid grid-cols-3 gap-3'>
                {meanItems.map((item) => (
                  <div key={item.key} className='rounded-[10px] border p-3'>
                    <div className='text-xs font-semibold text-muted-foreground'>
                      {item.label}
                    </div>
                    <div className='text-[22px] font-bold tabular-nums'>
                      {formatNumber(item.value, 1)}
                    </div>
                  </div>
                ))}
              </div>
              <div className='mt-2.5 flex items-center gap-2.5'>
                <span
                  aria-hidden='true'
                  className='size-9 rounded-lg border'
                  style={{
                    background: `rgb(${Math.round(mean.r)}, ${Math.round(mean.g)}, ${Math.round(mean.b)})`,
                  }}
                />
                <span className='text-muted-foreground'>
                  {copy.meanSwatch} {detail.id}
                </span>
              </div>
            </>
          ) : (
            <p className='text-muted-foreground'>{copy.noMean}</p>
          )}
        </section>
      </div>

      <div className='flex min-w-0 flex-col gap-5'>
        <section>
          <h3 className='mb-2.5 text-sm font-semibold'>{copy.pathTitle}</h3>
          {detail.path.length > 0 ? (
            <ol className='flex flex-col gap-1.5'>
              {detail.path.map((step, index) => (
                <li
                  key={step}
                  className='flex items-center gap-2.5 rounded-lg bg-muted px-3 py-2'
                >
                  <span className='w-4 text-muted-foreground tabular-nums'>
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className='text-muted-foreground'>{copy.noPath}</p>
          )}
        </section>

        <section>
          <h3 className='mb-1.5 text-sm font-semibold'>{copy.historyTitle}</h3>
          {detail.history.length > 0 ? (
            <div className='flex flex-col'>
              {detail.history.map((entry) => {
                return (
                  <div
                    key={entry.at}
                    className='flex items-center gap-3 border-b py-2.5 last:border-b-0'
                  >
                    <span className='w-28 shrink-0 text-muted-foreground tabular-nums'>
                      {formatDayTime(entry.at)}
                    </span>
                    <PlantStatusBadge status={entry.status} />
                    <span className='ms-auto text-muted-foreground tabular-nums'>
                      {formatConfidence(entry.confidence)}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className='text-muted-foreground'>{copy.noHistory}</p>
          )}
        </section>
      </div>
    </div>
  )
}

interface PlantDetailCardProps {
  plantId: PlantId
  onClose: () => void
}

export function PlantDetailCard({ plantId, onClose }: PlantDetailCardProps) {
  const query = usePlantDetail(plantId)
  const detail = query.data

  return (
    <Card id='plant-detail' className='scroll-mt-20 gap-0 p-5 shadow-none'>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
        <h2 className='text-[15px] font-semibold'>
          {copy.title} {plantId}
        </h2>
        <div className='flex items-center gap-2'>
          {detail && (
            <PlantStatusBadge
              status={detail.status}
              detail={
                detail.confidence === null
                  ? undefined
                  : formatConfidence(detail.confidence)
              }
            />
          )}
          <Button
            variant='ghost'
            size='icon'
            className='size-8'
            aria-label={copy.close}
            onClick={onClose}
          >
            <X aria-hidden='true' />
          </Button>
        </div>
      </div>

      <QueryBoundary
        query={query}
        skeleton={<DetailSkeleton />}
        empty={{
          when: (data) => data === null,
          view: <EmptyState title={copy.empty} />,
        }}
      >
        {(data) => data && <DetailBody detail={data} />}
      </QueryBoundary>
    </Card>
  )
}
