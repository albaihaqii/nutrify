import { id } from '@/locales/id'
import {
  Camera,
  CircleCheck,
  CircleHelp,
  Cpu,
  PowerOff,
  WifiOff,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { StatusBadge } from '@/components/status-badge'
import { type Device } from '../data/devices'
import { formatLastSeen } from '../lib/last-seen'

const typeIcon = { sensor_node: Cpu, webcam: Camera } as const

const statusBadge = {
  online: { tone: 'ok', icon: CircleCheck, dashed: false },
  offline: { tone: 'high', icon: WifiOff, dashed: false },
  never_seen: { tone: 'check', icon: CircleHelp, dashed: true },
} as const

interface DeviceCardProps {
  device: Device
  /** Current time in ms, shared by all cards so they tick together. */
  now: number
  /** Analysis interval in seconds, shown on the webcam only. */
  analysisInterval?: number
  busy: boolean
  onToggleActive: (device: Device, active: boolean) => void
}

function Row({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <>
      <dt className='text-muted-foreground'>{label}</dt>
      <dd className='m-0 font-medium'>{children}</dd>
    </>
  )
}

export function DeviceCard({
  device,
  now,
  analysisInterval,
  busy,
  onToggleActive,
}: DeviceCardProps) {
  const TypeIcon = typeIcon[device.type]
  const badge = device.isActive ? statusBadge[device.status] : null
  const BadgeIcon = badge?.icon ?? PowerOff
  const lastSeen = formatLastSeen(device.lastSeenAt, now)
  const isOffline = device.isActive && device.status === 'offline'

  return (
    <Card className='gap-0 p-5 shadow-none'>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
        <h2 className='flex items-center gap-2 text-[15px] font-semibold'>
          <TypeIcon className='size-4' aria-hidden='true' />
          {device.name}
        </h2>
        <StatusBadge
          tone={badge?.tone ?? 'check'}
          dashed={badge?.dashed ?? false}
        >
          <BadgeIcon aria-hidden='true' />
          {device.isActive
            ? id.devices.status[device.status]
            : id.devices.status.inactive}
        </StatusBadge>
      </div>

      {isOffline && (
        <div
          role='alert'
          className='mb-4 flex items-start gap-2.5 rounded-[10px] bg-status-high-bg px-4 py-3 text-status-high-fg'
        >
          <WifiOff className='mt-0.5 size-4 shrink-0' aria-hidden='true' />
          <div>
            <strong>
              {id.devices.offline.title.replace('{name}', device.name)}
            </strong>{' '}
            {id.devices.offline.since.replace('{ago}', lastSeen)}
          </div>
        </div>
      )}

      <dl className='grid grid-cols-[130px_1fr] gap-x-3 gap-y-2'>
        <Row label={id.devices.fields.lastSeen}>
          <span className='tabular-nums'>{lastSeen}</span>
        </Row>
        {device.firmwareVersion && (
          <Row label={id.devices.fields.firmware}>
            <span className='tabular-nums'>{device.firmwareVersion}</span>
          </Row>
        )}
        {device.type === 'webcam' && analysisInterval !== undefined && (
          <Row label={id.devices.fields.interval}>
            {id.devices.intervalValue.replace('{n}', String(analysisInterval))}
          </Row>
        )}
        <Row label={id.devices.fields.code}>
          <span className='font-mono text-[13px]'>{device.code}</span>
        </Row>
      </dl>

      <div className='mt-4 flex items-center justify-between border-t pt-4'>
        <Label htmlFor={`device-active-${device.id}`}>
          {id.devices.fields.active}
        </Label>
        <Switch
          id={`device-active-${device.id}`}
          checked={device.isActive}
          disabled={busy}
          onCheckedChange={(checked) => onToggleActive(device, checked)}
        />
      </div>
    </Card>
  )
}
