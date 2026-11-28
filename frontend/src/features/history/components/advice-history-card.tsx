import { Link } from '@tanstack/react-router'
import { id } from '@/locales/id'
import { formatDayTime } from '@/lib/format-time'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/empty-state'
import { QueryBoundary } from '@/components/query-boundary'
import { SeverityBadge } from '@/components/severity-badge'
import { useAdvicePage } from '@/features/advisor/api/advice-queries'
import { targetLabel } from '@/features/advisor/lib/target'
import { type ObservationFilters } from '../data/history'

const ROWS = 5

/** The newest advice in the range and hole chosen above; the Penasihat page has the rest. */
export function AdviceHistoryCard({
  filters,
}: {
  filters: Pick<ObservationFilters, 'range' | 'plant'>
}) {
  const query = useAdvicePage(
    { source: 'all', plant: filters.plant, range: filters.range, page: 1 },
    ROWS
  )
  const columns = id.history.advice.columns

  return (
    <Card className='gap-0 p-5 shadow-none'>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
        <h2 className='text-[15px] font-semibold'>{id.history.advice.title}</h2>
        <Button asChild variant='outline' className='h-8 px-2.5 text-[13px]'>
          <Link to='/advisor'>{id.history.advice.viewAll}</Link>
        </Button>
      </div>

      <QueryBoundary
        query={query}
        skeleton={<Skeleton className='h-[220px] w-full' />}
        empty={{
          when: (data) => data.total === 0,
          view: <EmptyState title={id.history.advice.empty} />,
        }}
      >
        {(data) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{columns.time}</TableHead>
                <TableHead>{columns.plant}</TableHead>
                <TableHead>{columns.severity}</TableHead>
                <TableHead>{columns.summary}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className='align-top whitespace-nowrap tabular-nums'>
                    {formatDayTime(item.createdAt)}
                  </TableCell>
                  <TableCell className='align-top font-semibold'>
                    {targetLabel(item.plantPosition)}
                  </TableCell>
                  <TableCell className='align-top'>
                    <SeverityBadge severity={item.severity} />
                  </TableCell>
                  <TableCell className='min-w-[220px] align-top whitespace-normal'>
                    {item.summary}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </QueryBoundary>
    </Card>
  )
}
