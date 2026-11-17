import { id } from '@/locales/id'
import {
  Info,
  OctagonAlert,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import { StatusBadge } from '@/components/status-badge'

export type Severity = 'info' | 'warning' | 'critical'

const severityBadge = {
  info: { tone: 'low', icon: Info },
  warning: { tone: 'n', icon: TriangleAlert },
  critical: { tone: 'high', icon: OctagonAlert },
} as const satisfies Record<
  Severity,
  { tone: 'low' | 'n' | 'high'; icon: LucideIcon }
>

/** How serious an advice is. Icon plus text, never colour alone. */
export function SeverityBadge({ severity }: { severity: Severity }) {
  const { tone, icon: Icon } = severityBadge[severity]

  return (
    <StatusBadge tone={tone}>
      <Icon aria-hidden='true' />
      {id.severity[severity]}
    </StatusBadge>
  )
}
