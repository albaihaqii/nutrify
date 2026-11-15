import { id } from '@/locales/id'
import { CircleCheck, CircleHelp, TriangleAlert, WifiOff } from 'lucide-react'
import { formatNumber } from '@/lib/format'
import { formatDayTime } from '@/lib/format-time'
import { StatusBadge } from '@/components/status-badge'
import { type LabelClass, type QcStatus, type Snapshot } from '../data/dataset'
import { LabelPicker } from './label-picker'
import { SnapshotThumbnail } from './snapshot-thumbnail'

const qcBadge = {
  ok: { tone: 'ok', icon: CircleCheck, dashed: false },
  invalid_leaf: { tone: 'n', icon: TriangleAlert, dashed: false },
  stale_sensor: { tone: 'high', icon: WifiOff, dashed: false },
  needs_check: { tone: 'check', icon: CircleHelp, dashed: true },
} as const satisfies Record<
  QcStatus,
  {
    tone: 'ok' | 'n' | 'high' | 'check'
    icon: typeof CircleCheck
    dashed: boolean
  }
>

function sensorText({ ph, ec, temperature }: Snapshot): string {
  if (ph === null || ec === null || temperature === null) {
    return id.dataset.card.sensorMissing
  }
  return id.dataset.card.sensorLine
    .replace('{ph}', formatNumber(ph, 1))
    .replace('{ec}', formatNumber(ec, 2))
    .replace('{temperature}', formatNumber(temperature, 1))
}

interface SnapshotCardProps {
  snapshot: Snapshot
  /** Only admins can label. */
  canLabel: boolean
  /** A label is being saved; every picker waits. */
  busy: boolean
  onLabel: (snapshot: Snapshot, label: LabelClass | null) => void
}

export function SnapshotCard({
  snapshot,
  canLabel,
  busy,
  onLabel,
}: SnapshotCardProps) {
  const badge = qcBadge[snapshot.qc]
  const Icon = badge.icon

  return (
    <article className='flex flex-col gap-2.5 rounded-xl border bg-card p-3 text-card-foreground'>
      <SnapshotThumbnail picture={snapshot.picture} />

      <div className='flex items-baseline justify-between gap-2'>
        <strong className='font-semibold'>{snapshot.plantId}</strong>
        <span className='text-xs text-muted-foreground tabular-nums'>
          {formatDayTime(snapshot.at)}
        </span>
      </div>

      <div className='flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs'>
        <span className='text-muted-foreground tabular-nums'>
          {sensorText(snapshot)}
        </span>
        <StatusBadge tone={badge.tone} dashed={badge.dashed}>
          <Icon aria-hidden='true' />
          {id.dataset.qc[snapshot.qc]}
        </StatusBadge>
      </div>

      <LabelPicker
        plantId={snapshot.plantId}
        value={snapshot.label}
        disabled={!canLabel || busy}
        onChange={(label) => onLabel(snapshot, label)}
      />
    </article>
  )
}
