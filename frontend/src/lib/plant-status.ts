import { CircleCheck, CircleHelp, Droplet, TriangleAlert } from 'lucide-react'

export type PlantStatus = 'ok' | 'n' | 'fe' | 'check'

export const plantStatusIcon = {
  ok: CircleCheck,
  n: TriangleAlert,
  fe: Droplet,
  check: CircleHelp,
} as const

export const plantStatusClass: Record<PlantStatus, string> = {
  ok: 'bg-status-ok-bg text-status-ok-fg',
  n: 'bg-status-n-bg text-status-n-fg',
  fe: 'bg-status-fe-bg text-status-fe-fg',
  check:
    'border-[1.5px] border-dashed border-current bg-status-check-bg text-status-check-fg',
}
