import { id } from '@/locales/id'
import { CircleCheck, TriangleAlert } from 'lucide-react'
import { formatAgo } from '@/lib/format'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/status-badge'
import { latestAdvice, type AdvisorSeverity } from '../data/advisor'

const severityBadge = {
  low: { tone: 'ok', icon: CircleCheck },
  medium: { tone: 'n', icon: TriangleAlert },
  high: { tone: 'high', icon: TriangleAlert },
} as const satisfies Record<
  AdvisorSeverity,
  { tone: 'ok' | 'n' | 'high'; icon: typeof CircleCheck }
>

export function AdvisorCard() {
  const advice = latestAdvice
  const badge = severityBadge[advice.severity]
  const BadgeIcon = badge.icon

  return (
    <Card className='gap-0 p-5 shadow-none'>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
        <h2 className='text-[15px] font-semibold'>
          {id.dashboard.advisor.title}
        </h2>
        <StatusBadge tone={badge.tone}>
          <BadgeIcon aria-hidden='true' />
          {id.dashboard.advisor.severity[advice.severity]}
        </StatusBadge>
      </div>

      <p className='font-semibold'>{advice.title}</p>
      <p className='mt-1.5 text-muted-foreground'>
        <strong className='font-semibold text-foreground'>
          {id.dashboard.advisor.causeLabel}
        </strong>{' '}
        {advice.cause}
      </p>
      <ol className='mt-2.5 flex list-decimal flex-col gap-1 ps-[18px]'>
        {advice.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      <p className='mt-3 border-t pt-3 text-xs text-muted-foreground'>
        {id.dashboard.advisor.sourcePrefix} {advice.source} ·{' '}
        {formatAgo(advice.minutesAgo)}. {id.dashboard.advisor.disclaimer}
      </p>
    </Card>
  )
}
