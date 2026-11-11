import { id } from '@/locales/id'
import { RotateCcw } from 'lucide-react'
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
  return (
    <Card className='gap-0 p-5 shadow-none'>
      <CardHeading
        title={id.settings.calibration.title}
        description={id.settings.calibration.hint}
        action={
          <Button type='button' variant='outline' onClick={onReset}>
            <RotateCcw aria-hidden='true' />
            {id.settings.calibration.reset}
          </Button>
        }
      />
      <RoiEditor boxes={boxes} onChange={onChange} />
    </Card>
  )
}
