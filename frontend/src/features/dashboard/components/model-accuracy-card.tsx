import { id } from '@/locales/id'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/status-badge'
import { modelAccuracies } from '../data/models'

export function ModelAccuracyCard() {
  return (
    <Card className='gap-0 p-5 shadow-none'>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
        <h2 className='text-[15px] font-semibold'>
          {id.dashboard.models.title}
        </h2>
        <StatusBadge tone='check'>{id.dashboard.models.sample}</StatusBadge>
      </div>

      <div className='flex flex-col gap-3.5'>
        {modelAccuracies.map((model) => {
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
    </Card>
  )
}
