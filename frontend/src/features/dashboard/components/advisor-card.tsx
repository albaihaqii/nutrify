import { id } from '@/locales/id'
import { CircleCheck, TriangleAlert } from 'lucide-react'
import { formatAgo } from '@/lib/format'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/empty-state'
import { QueryBoundary } from '@/components/query-boundary'
import { StatusBadge } from '@/components/status-badge'
import { useLatestAdvice } from '../api/dashboard-queries'
import { type AdvisorAdvice, type AdvisorSeverity } from '../data/advisor'

const severityBadge = {
  low: { tone: 'ok', icon: CircleCheck },
  medium: { tone: 'n', icon: TriangleAlert },
  high: { tone: 'high', icon: TriangleAlert },
} as const satisfies Record<
  AdvisorSeverity,
  { tone: 'ok' | 'n' | 'high'; icon: typeof CircleCheck }
>

function AdviceSkeleton() {
  return (
    <div className='flex flex-col gap-2.5' aria-hidden='true'>
      <Skeleton className='h-4 w-4/5' />
      <Skeleton className='h-14 w-full' />
      <Skeleton className='h-20 w-full' />
      <Skeleton className='h-3 w-3/5' />
    </div>
  )
}

function AdviceBody({ advice }: { advice: AdvisorAdvice }) {
  return (
    <>
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
    </>
  )
}

export function AdvisorCard() {
  const query = useLatestAdvice()
  const severity = query.data?.severity
  const badge = severity ? severityBadge[severity] : null
  const BadgeIcon = badge?.icon

  return (
    <Card className='gap-0 p-5 shadow-none'>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
        <h2 className='text-[15px] font-semibold'>
          {id.dashboard.advisor.title}
        </h2>
        {badge && BadgeIcon && severity && (
          <StatusBadge tone={badge.tone}>
            <BadgeIcon aria-hidden='true' />
            {id.dashboard.advisor.severity[severity]}
          </StatusBadge>
        )}
      </div>

      <QueryBoundary
        query={query}
        skeleton={<AdviceSkeleton />}
        empty={{
          when: (advice) => advice === null,
          view: <EmptyState title={id.dashboard.advisor.empty} />,
        }}
      >
        {(advice) => advice && <AdviceBody advice={advice} />}
      </QueryBoundary>
    </Card>
  )
}
