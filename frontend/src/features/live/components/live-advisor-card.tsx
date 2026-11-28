import { id } from '@/locales/id'
import { LatestAdviceCard } from '@/features/advisor/components/latest-advice-card'

export function LiveAdvisorCard() {
  return (
    <LatestAdviceCard
      title={id.live.advisor.title}
      emptyTitle={id.live.advisor.empty}
    />
  )
}
