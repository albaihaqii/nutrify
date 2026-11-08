import { id } from '@/locales/id'
import { Clock } from 'lucide-react'
import { formatAgo } from '@/lib/format'

export function StaleBanner({ minutesAgo }: { minutesAgo: number }) {
  return (
    <div
      role='status'
      className='flex items-center gap-2 rounded-md bg-status-n-bg px-3 py-2.5 text-status-n-fg'
    >
      <Clock aria-hidden='true' className='size-4 shrink-0' />
      {id.state.lastData} {formatAgo(minutesAgo)}
    </div>
  )
}
