import { Link } from '@tanstack/react-router'
import { id } from '@/locales/id'
import { Button } from '@/components/ui/button'
import { LatestAdviceCard } from '@/features/advisor/components/latest-advice-card'

export function AdvisorCard() {
  return (
    <LatestAdviceCard
      title={id.dashboard.advisor.title}
      emptyTitle={id.dashboard.advisor.empty}
      action={
        <Button asChild variant='outline' className='h-8 px-2.5 text-[13px]'>
          <Link to='/advisor'>{id.dashboard.advisor.viewAll}</Link>
        </Button>
      }
    />
  )
}
