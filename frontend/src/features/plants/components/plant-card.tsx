import { id } from '@/locales/id'
import { formatConfidence } from '@/lib/confidence'
import { formatClock } from '@/lib/format-time'
import { plantStatusIcon } from '@/lib/plant-status'
import { cn } from '@/lib/utils'
import { StatusBadge } from '@/components/status-badge'
import { type PlantSummary } from '../data/plants'
import { LeafIllustration } from './leaf-illustration'

interface PlantCardProps {
  plant: PlantSummary
  selected: boolean
  onSelect: (plantId: string) => void
}

export function PlantCard({ plant, selected, onSelect }: PlantCardProps) {
  const Icon = plantStatusIcon[plant.status]

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
        <LeafIllustration
          status={plant.status}
          className='h-[88px] w-[110px]'
        />
      </div>
      <div className='flex items-center justify-between gap-2'>
        <strong className='text-base font-semibold'>
          {id.plants.hole} {plant.id}
        </strong>
        <StatusBadge tone={plant.status} dashed={plant.status === 'check'}>
          <Icon aria-hidden='true' />
          {id.plantStatus[plant.status]}
        </StatusBadge>
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
