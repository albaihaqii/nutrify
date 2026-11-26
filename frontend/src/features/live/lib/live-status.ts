import { id } from '@/locales/id'
import { CircleSlash, type LucideIcon } from 'lucide-react'
import { plantStatusIcon } from '@/lib/plant-status'
import { type LiveStatus } from '../data/live-analysis'

export const liveStatusIcon: Record<LiveStatus, LucideIcon> = {
  ...plantStatusIcon,
  none: CircleSlash,
}

export function liveStatusLabel(status: LiveStatus): string {
  return status === 'none' ? id.live.status.none : id.plantStatus[status]
}

/** A dashed grey box and badge: the model gave no class for this hole. */
export function isUncertain(status: LiveStatus): boolean {
  return status === 'check' || status === 'none'
}
