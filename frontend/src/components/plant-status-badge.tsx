import { StatusBadge } from '@/components/status-badge'
import { type LiveStatus } from '@/features/live/data/live-analysis'
import {
  isUncertain,
  liveStatusIcon,
  liveStatusLabel,
} from '@/features/live/lib/live-status'

interface PlantStatusBadgeProps {
  status: LiveStatus
  /** Text after the label, for example the confidence. */
  detail?: string
}

/** The status of a hole: icon and label; dashed when the model gave no class. */
export function PlantStatusBadge({ status, detail }: PlantStatusBadgeProps) {
  const Icon = liveStatusIcon[status]

  return (
    <StatusBadge
      tone={status === 'none' ? 'check' : status}
      dashed={isUncertain(status)}
    >
      <Icon aria-hidden='true' />
      {liveStatusLabel(status)}
      {detail && ` · ${detail}`}
    </StatusBadge>
  )
}
