import { id } from '@/locales/id'
import { CircleHelp, Droplet, TriangleAlert, WifiOff } from 'lucide-react'
import { formatAgo } from '@/lib/format'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/status-badge'
import { latestAlerts, type AlertKind } from '../data/alerts'

const kinds = {
  fe: { tone: 'fe', icon: Droplet },
  check: { tone: 'check', icon: CircleHelp },
  n: { tone: 'n', icon: TriangleAlert },
  sensorOffline: { tone: 'check', icon: WifiOff },
} as const satisfies Record<
  AlertKind,
  { tone: 'fe' | 'check' | 'n'; icon: typeof Droplet }
>

export function AlertsCard() {
  return (
    <Card className='gap-0 p-5 shadow-none'>
      <div className='mb-4'>
        <h2 className='text-[15px] font-semibold'>
          {id.dashboard.alerts.title}
        </h2>
      </div>

      <ul className='flex flex-col'>
        {latestAlerts.map((alert) => {
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
    </Card>
  )
}
