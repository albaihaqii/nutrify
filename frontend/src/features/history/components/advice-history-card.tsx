import { Link } from '@tanstack/react-router'
import { id } from '@/locales/id'
import { formatDayTime } from '@/lib/format-time'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/empty-state'
import { QueryBoundary } from '@/components/query-boundary'
import { SeverityBadge } from '@/components/severity-badge'
import { StatusBadge } from '@/components/status-badge'
import { useAdviceHistory } from '../api/history-queries'
import { type AdviceEntry } from '../data/history'

function AdviceSkeleton() {
  return (
    <div className='flex flex-col gap-3' aria-hidden='true'>
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className='h-10 w-full' />
      ))}
    </div>
  )
}

function AdviceList({ entries }: { entries: AdviceEntry[] }) {
  return (
    <ul className='flex flex-col'>
      {entries.map((entry) => {
        return (
          <li
            key={entry.id}
            className='flex flex-wrap items-center gap-3 border-b py-3 last:border-b-0'
          >
            <span className='min-w-[110px] text-muted-foreground tabular-nums'>
              {formatDayTime(entry.at)}
            </span>
            <StatusBadge tone='check'>
              {id.history.advice.sources[entry.source]}
            </StatusBadge>
            <SeverityBadge severity={entry.severity} />
            <span className='min-w-0 flex-1'>{entry.summary}</span>
            <Button
              asChild
              variant='outline'
              className='h-8 px-2.5 text-[13px]'
            >
              <Link to='/advisor'>{id.history.advice.view}</Link>
            </Button>
          </li>
        )
      })}
    </ul>
  )
}

export function AdviceHistoryCard() {
  const query = useAdviceHistory()

  return (
    <Card className='gap-0 p-5 shadow-none'>
      <div className='mb-4'>
        <h2 className='text-[15px] font-semibold'>{id.history.advice.title}</h2>
      </div>

      <QueryBoundary
        query={query}
        skeleton={<AdviceSkeleton />}
        empty={{
          when: (entries) => entries.length === 0,
          view: <EmptyState title={id.history.advice.empty} />,
        }}
      >
        {(entries) => <AdviceList entries={entries} />}
      </QueryBoundary>
    </Card>
  )
}
