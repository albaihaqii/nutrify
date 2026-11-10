import { type UseQueryResult } from '@tanstack/react-query'
import { id } from '@/locales/id'
import { CircleCheck, TriangleAlert } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/empty-state'
import { QueryBoundary } from '@/components/query-boundary'
import { StatusBadge } from '@/components/status-badge'
import { type ComparatorResult, type LiveAnalysis } from '../data/live-analysis'

type Verdict = 'agree' | 'partial' | 'differ'

const verdictBadge = {
  agree: { tone: 'ok', icon: CircleCheck },
  partial: { tone: 'n', icon: TriangleAlert },
  differ: { tone: 'high', icon: TriangleAlert },
} as const satisfies Record<
  Verdict,
  { tone: 'ok' | 'n' | 'high'; icon: typeof CircleCheck }
>

function verdictOf({ agree, total }: ComparatorResult): Verdict {
  const ratio = total === 0 ? 0 : agree / total
  if (ratio >= 0.8) return 'agree'
  if (ratio >= 0.5) return 'partial'
  return 'differ'
}

function ComparatorsSkeleton() {
  return (
    <div className='flex flex-col gap-3' aria-hidden='true'>
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className='h-7 w-full' />
      ))}
    </div>
  )
}

function ComparatorsList({ analysis }: { analysis: LiveAnalysis }) {
  const needCheck = analysis.plants
    .filter((plant) => plant.status === 'check')
    .map((plant) => plant.id)

  return (
    <>
      <div className='flex flex-col'>
        {analysis.comparators.map((model) => {
          const verdict = verdictOf(model)
          const badge = verdictBadge[verdict]
          const Icon = badge.icon
          return (
            <div
              key={model.name}
              className='flex items-center justify-between gap-2 py-2'
            >
              <span className='font-medium'>{model.name}</span>
              <span className='ms-auto text-muted-foreground tabular-nums'>
                {id.live.comparators.agreeOf
                  .replace('{agree}', String(model.agree))
                  .replace('{total}', String(model.total))}
              </span>
              <StatusBadge tone={badge.tone}>
                <Icon aria-hidden='true' />
                {id.live.comparators.verdict[verdict]}
              </StatusBadge>
            </div>
          )
        })}
      </div>
      <p className='mt-1.5 border-t pt-3 text-xs text-muted-foreground'>
        {needCheck.length > 0
          ? id.live.comparators.noteCheck.replace(
              '{plants}',
              needCheck.join(', ')
            )
          : id.live.comparators.noteAllAgree}
      </p>
    </>
  )
}

export function ComparatorsCard({
  query,
}: {
  query: UseQueryResult<LiveAnalysis>
}) {
  return (
    <Card className='gap-0 p-5 shadow-none'>
      <div className='mb-4'>
        <h2 className='text-[15px] font-semibold'>
          {id.live.comparators.title}
        </h2>
      </div>

      <QueryBoundary
        query={query}
        skeleton={<ComparatorsSkeleton />}
        empty={{
          when: (analysis) => analysis.comparators.length === 0,
          view: <EmptyState title={id.live.comparators.empty} />,
        }}
      >
        {(analysis) => <ComparatorsList analysis={analysis} />}
      </QueryBoundary>
    </Card>
  )
}
