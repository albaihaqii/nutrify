import { useState } from 'react'
import { id } from '@/locales/id'
import { RefreshCw, RotateCcw } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { cameraSnapshotUrl } from '@/lib/camera-url'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { type RoiBox } from '../lib/roi'
import { CardHeading } from './card-heading'
import { RoiEditor } from './roi-editor'

interface CalibrationCardProps {
  boxes: RoiBox[]
  onChange: (boxes: RoiBox[]) => void
  onReset: () => void
}

export function CalibrationCard({
  boxes,
  onChange,
  onReset,
}: CalibrationCardProps) {
  const accessToken = useAuthStore((state) => state.auth.accessToken)
  const [frameVersion, setFrameVersion] = useState(0)

  return (
    <Card className='gap-0 p-5 shadow-none'>
      <CardHeading
        title={id.settings.calibration.title}
        description={id.settings.calibration.hint}
        action={
          <div className='flex flex-wrap gap-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => setFrameVersion((version) => version + 1)}
            >
              <RefreshCw aria-hidden='true' />
              {id.settings.calibration.refreshFrame}
            </Button>
            <Button type='button' variant='outline' onClick={onReset}>
              <RotateCcw aria-hidden='true' />
              {id.settings.calibration.reset}
            </Button>
          </div>
        }
      />
      <RoiEditor
        boxes={boxes}
        frameSrc={cameraSnapshotUrl(accessToken, frameVersion)}
        onChange={onChange}
      />
    </Card>
  )
}
