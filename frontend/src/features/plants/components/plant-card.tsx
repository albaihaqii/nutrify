import { id } from '@/locales/id'
import { formatConfidence } from '@/lib/confidence'
import { formatClock } from '@/lib/format-time'
import { type PlantId } from '@/lib/plants'
import { cn } from '@/lib/utils'
import { PlantStatusBadge } from '@/components/plant-status-badge'
import { type PlantSummary } from '../data/plants'
import { ObservationImage } from './observation-image'

interface PlantCardProps {
  plant: PlantSummary
  selected: boolean
  onSelect: (plantId: PlantId) => void
}

export function PlantCard({ plant, selected, onSelect }: PlantCardProps) {
  return (
    <button
      type='button'
      aria-pressed={selected}
      onClick={() => onSelect(plant.id)}
      className={cn(
        'flex flex-col gap-3 rounded-xl border bg-card p-5 text-start text-card-foreground transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-primary',
        selected && 'outline-2 outline-primary'
      )}
    >
      <div className='flex h-[120px] items-center justify-center rounded-lg bg-[#18241E] dark:bg-[#0A100D]'>
        <ObservationImage
          observationId={plant.observationId}
          view='photo'
          label={`${id.plants.detail.photo} ${plant.id}`}
          className='size-full rounded-lg'
        />
      </div>
      <div className='flex items-center justify-between gap-2'>
        <strong className='text-base font-semibold'>
          {id.plants.hole} {plant.id}
        </strong>
        <PlantStatusBadge status={plant.status} />
      </div>
      <div className='flex items-center justify-between gap-2 text-muted-foreground'>
        <span>
          {id.plants.confidence}{' '}
          <span className='font-semibold text-foreground tabular-nums'>
            {formatConfidence(plant.confidence)}
          </span>
        </span>
        <span className='tabular-nums'>
          {id.plants.updated.replace('{time}', formatClock(plant.updatedAt))}
        </span>
      </div>
    </button>
  )
}
