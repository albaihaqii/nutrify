import { id } from '@/locales/id'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/empty-state'

// The accuracies come from the final evaluation (roadmap step 5c).
export function ModelAccuracyCard() {
  return (
    <Card className='gap-0 p-5 shadow-none'>
      <div className='mb-4'>
        <h2 className='text-[15px] font-semibold'>
          {id.dashboard.models.title}
        </h2>
      </div>
      <EmptyState fill title={id.dashboard.noData} className='min-h-[200px]' />
    </Card>
  )
}
