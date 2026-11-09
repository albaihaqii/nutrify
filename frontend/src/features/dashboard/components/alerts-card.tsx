import { id } from '@/locales/id'
import { CircleHelp, Droplet, TriangleAlert, WifiOff } from 'lucide-react'
import { formatAgo } from '@/lib/format'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/empty-state'
import { QueryBoundary } from '@/components/query-boundary'
import { StatusBadge } from '@/components/status-badge'
import { useLatestAlerts } from '../api/dashboard-queries'
import { type AlertKind, type DashboardAlert } from '../data/alerts'

const kinds = {
  fe: { tone: 'fe', icon: Droplet },
  check: { tone: 'check', icon: CircleHelp },
  n: { tone: 'n', icon: TriangleAlert },
  sensorOffline: { tone: 'check', icon: WifiOff },
} as const satisfies Record<
  AlertKind,
  { tone: 'fe' | 'check' | 'n'; icon: typeof Droplet }
>

function AlertsSkeleton() {
  return (
    <div className='flex flex-col' aria-hidden='true'>
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className='flex gap-3 border-b py-3 last:border-b-0'>
          <Skeleton className='h-6 w-8 shrink-0 rounded-full' />
          <div className='flex-1'>
            <Skeleton className='h-4 w-4/5' />
            <Skeleton className='mt-1.5 h-3 w-1/4' />
          </div>
        </div>
      ))}
    </div>
  )
}

function AlertsList({ alerts }: { alerts: DashboardAlert[] }) {
  return (
    <ul className='flex flex-col'>
      {alerts.map((alert) => {
        const kind = kinds[alert.kind]
        const Icon = kind.icon
        return (
          <li
            key={alert.id}
            className='flex gap-3 border-b py-3 last:border-b-0'
          >
            <StatusBadge tone={kind.tone} className='h-6 shrink-0'>
              <Icon aria-hidden='true' />
            </StatusBadge>
            <div className='min-w-0'>
              <div className='font-medium'>{alert.title}</div>
              <div className='text-xs text-muted-foreground'>
                {formatAgo(alert.minutesAgo)}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function AlertsCard() {
  const query = useLatestAlerts()

  return (
    <Card className='gap-0 p-5 shadow-none'>
      <div className='mb-4'>
        <h2 className='text-[15px] font-semibold'>
          {id.dashboard.alerts.title}
        </h2>
      </div>

      <QueryBoundary
        query={query}
        skeleton={<AlertsSkeleton />}
        empty={{
          when: (alerts) => alerts.length === 0,
          view: <EmptyState title={id.dashboard.alerts.empty} />,
        }}
      >
        {(alerts) => <AlertsList alerts={alerts} />}
      </QueryBoundary>
    </Card>
  )
}
