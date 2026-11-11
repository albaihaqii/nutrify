import { useState } from 'react'
import { id } from '@/locales/id'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { EmptyState } from '@/components/empty-state'
import { Main } from '@/components/layout/main'
import { PageHead } from '@/components/page-head'
import { QueryBoundary } from '@/components/query-boundary'
import {
  useAnalysisInterval,
  useDevices,
  useRotateKey,
  useUpdateDevice,
} from './api/devices-queries'
import { AddDeviceDialog } from './components/add-device-dialog'
import { ApiKeyCard } from './components/api-key-card'
import { DeviceCard } from './components/device-card'
import { KeyRevealDialog } from './components/key-reveal-dialog'
import { type Device, type DeviceKey, type RevealedKey } from './data/devices'
import { useClock } from './lib/use-clock'

function DevicesSkeleton() {
  return (
    <div
      className='grid grid-cols-1 gap-6 @3xl/content:grid-cols-2'
      aria-hidden='true'
    >
      {Array.from({ length: 2 }, (_, index) => (
        <Card key={index} className='gap-0 p-5 shadow-none'>
          <Skeleton className='h-[190px] w-full' />
        </Card>
      ))}
    </div>
  )
}

export function Devices() {
  const isAdmin = useAuthStore((state) => state.auth.user?.role === 'admin')
  const now = useClock(5_000)

  const devices = useDevices(isAdmin)
  const interval = useAnalysisInterval(isAdmin)
  const update = useUpdateDevice()
  const rotate = useRotateKey()

  const [addOpen, setAddOpen] = useState(false)
  const [rotateTarget, setRotateTarget] = useState<Device | null>(null)
  const [revealed, setRevealed] = useState<RevealedKey | null>(null)

  function handleToggleActive(device: Device, active: boolean) {
    update.mutate({ id: device.id, isActive: active })
  }

  function handleRotate() {
    const target = rotateTarget
    if (!target) return
    rotate.mutate(target.id, {
      onSuccess: (key) => {
        if (key.apiKey) {
          setRevealed({ deviceName: target.name, apiKey: key.apiKey })
        }
      },
    })
  }

  function handleCreated(deviceName: string, key: DeviceKey) {
    if (key.apiKey) {
      setRevealed({ deviceName, apiKey: key.apiKey })
    } else {
      toast.success(id.devices.toast.added)
    }
  }

  return (
    <Main className='flex flex-col gap-6 p-6'>
      <div className='flex flex-wrap items-end justify-between gap-3'>
        <PageHead
          title={id.nav.items.devices}
          description={id.devices.subtitle}
        />
        {isAdmin && (
          <Button className='h-10' onClick={() => setAddOpen(true)}>
            <Plus aria-hidden='true' />
            {id.devices.add.button}
          </Button>
        )}
      </div>

      {isAdmin ? (
        <QueryBoundary
          query={devices}
          skeleton={<DevicesSkeleton />}
          empty={{
            when: (items) => items.length === 0,
            view: <EmptyState title={id.devices.empty} />,
          }}
        >
          {(items) => (
            <>
              <section className='grid grid-cols-1 gap-6 @3xl/content:grid-cols-2'>
                {items.map((device) => (
                  <DeviceCard
                    key={device.id}
                    device={device}
                    now={now}
                    analysisInterval={interval.data}
                    busy={update.isPending && update.variables.id === device.id}
                    onToggleActive={handleToggleActive}
                  />
                ))}
              </section>
              <ApiKeyCard devices={items} onRotate={setRotateTarget} />
            </>
          )}
        </QueryBoundary>
      ) : (
        <EmptyState title={id.devices.adminOnly} />
      )}

      {isAdmin && (
        <>
          <AddDeviceDialog
            open={addOpen}
            onOpenChange={setAddOpen}
            onCreated={handleCreated}
          />
          <ConfirmDialog
            open={rotateTarget !== null}
            onOpenChange={(open) => !open && setRotateTarget(null)}
            title={id.devices.key.rotateTitle.replace(
              '{name}',
              rotateTarget?.name ?? ''
            )}
            desc={id.devices.key.rotateDesc}
            confirmText={id.devices.key.rotate}
            cancelBtnText={id.devices.key.cancel}
            destructive
            handleConfirm={handleRotate}
          />
          <KeyRevealDialog
            reveal={revealed}
            onClose={() => setRevealed(null)}
          />
        </>
      )}
    </Main>
  )
}
