import { id } from '@/locales/id'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/empty-state'

// The Penasihat has no stored advice yet (roadmap step 5b).
export function AdviceHistoryCard() {
  return (
    <Card className='gap-0 p-5 shadow-none'>
      <div className='mb-4'>
        <h2 className='text-[15px] font-semibold'>{id.history.advice.title}</h2>
      </div>
      <EmptyState title={id.dashboard.noData} />
    </Card>
  )
}
