import { id } from '@/locales/id'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/empty-state'
import { QueryBoundary } from '@/components/query-boundary'
import { StatusBadge } from '@/components/status-badge'
import { useLiveAdvice } from '../api/live-queries'
import { type LiveAdvice } from '../data/live-advice'

function AdviceSkeleton() {
  return (
    <div className='flex flex-col gap-2.5' aria-hidden='true'>
      <Skeleton className='h-4 w-4/5' />
      <Skeleton className='h-10 w-full' />
      <Skeleton className='h-16 w-full' />
    </div>
  )
}

function AdviceBody({ advice }: { advice: LiveAdvice }) {
  return (
    <>
      <p className='font-semibold'>{advice.title}</p>
      <p className='mt-1.5 text-muted-foreground'>
        {id.live.advisor.causeLabel} {advice.cause}
      </p>
      <ol className='mt-2 flex list-decimal flex-col gap-1 ps-[18px]'>
        {advice.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p className='mt-3 border-t pt-3 text-xs text-muted-foreground'>
        {id.live.advisor.note}
      </p>
    </>
  )
}

export function LiveAdvisorCard() {
  const query = useLiveAdvice()
  const source = query.data?.source

  return (
    <Card className='gap-0 p-5 shadow-none'>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
        <h2 className='text-[15px] font-semibold'>{id.live.advisor.title}</h2>
        {source && (
          <StatusBadge tone='check'>
            {source === 'llm'
              ? id.live.advisor.sourceLlm
              : id.live.advisor.sourceFallback}
          </StatusBadge>
        )}
      </div>

      <QueryBoundary
        query={query}
        skeleton={<AdviceSkeleton />}
        empty={{
          when: (advice) => advice === null,
          view: <EmptyState title={id.live.advisor.empty} />,
        }}
      >
        {(advice) => advice && <AdviceBody advice={advice} />}
      </QueryBoundary>
    </Card>
  )
}
