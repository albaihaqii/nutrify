import { id } from '@/locales/id'
import { Key, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { type Device } from '../data/devices'

interface ApiKeyCardProps {
  devices: Device[]
  onRotate: (device: Device) => void
}

/** Only sensor nodes use a key; a webcam has none. */
export function ApiKeyCard({ devices, onRotate }: ApiKeyCardProps) {
  const nodes = devices.filter((device) => device.type === 'sensor_node')
  if (nodes.length === 0) return null

  return (
    <Card className='gap-0 p-5 shadow-none'>
      <h2 className='flex items-center gap-2 text-[15px] font-semibold'>
        <Key className='size-4' aria-hidden='true' />
        {id.devices.key.title}
      </h2>
      <p className='mt-1 mb-4 text-muted-foreground'>
        {id.devices.key.description}
      </p>

      <ul className='flex flex-col'>
        {nodes.map((node) => (
          <li
            key={node.id}
            className='flex flex-wrap items-center justify-between gap-3 border-b py-3 first:pt-0 last:border-b-0 last:pb-0'
          >
            <div>
              <div className='font-medium'>{node.name}</div>
              <div className='font-mono text-xs text-muted-foreground'>
                {node.code}
              </div>
            </div>
            <Button
              variant='outline'
              className='text-status-high-fg'
              onClick={() => onRotate(node)}
            >
              <RotateCw aria-hidden='true' />
              {id.devices.key.rotate}
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  )
}
