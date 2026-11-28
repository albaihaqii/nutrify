import { type ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/empty-state'
import { QueryBoundary } from '@/components/query-boundary'
import { useLatestAdvice } from '../api/advice-queries'
import { AdviceBody } from './advice-body'

interface LatestAdviceCardProps {
  title: string
  emptyTitle: string
  /** Extra controls at the right of the title, such as a link. */
  action?: ReactNode
}

function AdviceSkeleton() {
  return (
    <div className='flex flex-col gap-2.5' aria-hidden='true'>
      <Skeleton className='h-4 w-2/5' />
      <Skeleton className='h-5 w-4/5' />
      <Skeleton className='h-10 w-full' />
      <Skeleton className='h-16 w-full' />
    </div>
  )
}

/** The newest advice, for the Dashboard and the Live page. */
export function LatestAdviceCard({
  title,
  emptyTitle,
  action,
}: LatestAdviceCardProps) {
  const query = useLatestAdvice()

  return (
    <Card className='gap-0 p-5 shadow-none'>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
        <h2 className='text-[15px] font-semibold'>{title}</h2>
        {action}
      </div>

      <QueryBoundary
        query={query}
        skeleton={<AdviceSkeleton />}
        empty={{
          when: (advice) => advice === null,
          view: (
            <EmptyState fill title={emptyTitle} className='min-h-[200px]' />
          ),
        }}
      >
        {(advice) => advice && <AdviceBody advice={advice} />}
      </QueryBoundary>
    </Card>
  )
}
