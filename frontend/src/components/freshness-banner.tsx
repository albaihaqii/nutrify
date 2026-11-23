import { id } from '@/locales/id'
import { CircleCheck, Clock, WifiOff } from 'lucide-react'
import { formatAgeSeconds } from '@/lib/format'
import { type SensorFreshness } from '@/hooks/use-sensor-freshness'

const BASE = 'flex items-center gap-2 rounded-md px-3 py-2.5'

/** Orange when the sensor went quiet, red when the server is unreachable, green when data is back. */
export function FreshnessBanner({
  state,
  ageSeconds,
  recovered,
}: SensorFreshness) {
  if (state === 'stale' && ageSeconds !== null) {
    return (
      <div role='status' className={`${BASE} bg-status-n-bg text-status-n-fg`}>
        <Clock aria-hidden='true' className='size-4 shrink-0' />
        {id.state.staleSensor.replace('{ago}', formatAgeSeconds(ageSeconds))}
      </div>
    )
  }

  if (state === 'unreachable') {
    return (
      <div
        role='status'
        className={`${BASE} bg-status-high-bg text-status-high-fg`}
      >
        <WifiOff aria-hidden='true' className='size-4 shrink-0' />
        {id.state.serverUnreachable}
      </div>
    )
  }

  if (recovered) {
    return (
      <div
        role='status'
        className={`${BASE} bg-status-ok-bg text-status-ok-fg`}
      >
        <CircleCheck aria-hidden='true' className='size-4 shrink-0' />
        {id.state.recovered}
      </div>
    )
  }

  return null
}
