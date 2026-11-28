import { id } from '@/locales/id'
import { Check } from 'lucide-react'
import { formatDayTime } from '@/lib/format-time'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/empty-state'
import { QueryBoundary } from '@/components/query-boundary'
import { SeverityBadge } from '@/components/severity-badge'
import {
  useAcknowledgeAlert,
  useOpenAlerts,
} from '@/features/alerts/api/alerts-queries'
import { type AlertItem } from '@/features/alerts/data/alerts'
import { alertMessage } from '@/features/alerts/lib/message'

const ROWS = 5

function AlertRow({ alert }: { alert: AlertItem }) {
  const acknowledge = useAcknowledgeAlert()

  return (
    <li className='flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0'>
      <div className='flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground'>
        <SeverityBadge severity={alert.severity} />
        <span>{formatDayTime(alert.createdAt)}</span>
      </div>
      <p className='font-semibold'>{alertMessage(alert)}</p>
      {alert.acknowledged ? (
        <p className='flex items-center gap-1 text-xs text-muted-foreground'>
          <Check aria-hidden='true' className='size-3.5' />
          {id.alerts.seen}
        </p>
      ) : (
        <Button
          type='button'
          variant='outline'
          className='h-8 w-fit px-2.5 text-[13px]'
          disabled={acknowledge.isPending}
          onClick={() => acknowledge.mutate(alert.id)}
        >
          {id.alerts.acknowledge}
        </Button>
      )}
    </li>
  )
}

function AlertsSkeleton() {
  return (
    <div className='flex flex-col gap-3' aria-hidden='true'>
      <Skeleton className='h-14 w-full' />
      <Skeleton className='h-14 w-full' />
    </div>
  )
}

/** The alerts that are open now; each one disappears by itself when its condition is over. */
export function AlertsCard() {
  const query = useOpenAlerts(ROWS)

  return (
    <Card className='gap-0 p-5 shadow-none'>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
        <h2 className='text-[15px] font-semibold'>
          {id.dashboard.alerts.title}
        </h2>
        {query.data !== undefined && query.data.total > 0 && (
          <span className='text-xs text-muted-foreground'>
            {id.dashboard.alerts.open.replace(
              '{count}',
              String(query.data.total)
            )}
          </span>
        )}
      </div>

      <QueryBoundary
        query={query}
        skeleton={<AlertsSkeleton />}
        empty={{
          when: (data) => data.total === 0,
          view: (
            <EmptyState
              fill
              title={id.dashboard.alerts.empty}
              className='min-h-[200px]'
            />
          ),
        }}
      >
        {(data) => (
          <>
            <ul className='flex flex-col divide-y'>
              {data.rows.map((alert) => (
                <AlertRow key={alert.id} alert={alert} />
              ))}
            </ul>
            {data.total > data.rows.length && (
              <p className='mt-3 border-t pt-3 text-xs text-muted-foreground'>
                {id.dashboard.alerts.more.replace(
                  '{count}',
                  String(data.total - data.rows.length)
                )}
              </p>
            )}
          </>
        )}
      </QueryBoundary>
    </Card>
  )
}
