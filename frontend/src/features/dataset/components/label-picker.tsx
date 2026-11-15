import { id } from '@/locales/id'
import { Button } from '@/components/ui/button'
import { labelClasses, type LabelClass } from '../data/dataset'

interface LabelPickerProps {
  plantId: string
  value: LabelClass | null
  disabled: boolean
  /** Pressing the active label again clears it (null). */
  onChange: (label: LabelClass | null) => void
}

export function LabelPicker({
  plantId,
  value,
  disabled,
  onChange,
}: LabelPickerProps) {
  return (
    <div
      role='radiogroup'
      aria-label={id.dataset.labelGroup.replace('{plant}', plantId)}
      className='grid grid-cols-3 gap-1'
    >
      {labelClasses.map((labelClass) => {
        const active = value === labelClass
        return (
          <Button
            key={labelClass}
            type='button'
            role='radio'
            aria-checked={active}
            variant={active ? 'default' : 'outline'}
            disabled={disabled}
            className='h-9 px-1 text-xs'
            onClick={() => onChange(active ? null : labelClass)}
          >
            {id.dataset.labels[labelClass]}
          </Button>
        )
      })}
    </div>
  )
}
