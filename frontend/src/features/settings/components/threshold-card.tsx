import { useId, type ReactNode } from 'react'
import { id } from '@/locales/id'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import {
  type DraftErrors,
  type NumericKey,
  type SettingsDraft,
} from '../data/settings'
import { CardHeading } from './card-heading'
import { NumberField } from './number-field'

const GROUPS = [
  { name: 'ph', low: 'phMin', high: 'phMax' },
  { name: 'ec', low: 'ecMin', high: 'ecMax' },
  { name: 'temperature', low: 'temperatureMin', high: 'temperatureMax' },
] as const

export interface DraftCardProps {
  draft: SettingsDraft
  errors: DraftErrors
  onField: (key: NumericKey, value: string) => void
}

interface GroupProps {
  title: string
  /** Draws a thin line on the left when the groups sit in one row. */
  divided: boolean
  children: ReactNode
}

function Group({ title, divided, children }: GroupProps) {
  const headingId = useId()

  return (
    <div
      role='group'
      aria-labelledby={headingId}
      className={cn(
        'flex flex-col gap-4',
        divided && '@5xl/content:border-l @5xl/content:pl-6'
      )}
    >
      <h3 id={headingId} className='text-sm font-semibold'>
        {title}
      </h3>
      {children}
    </div>
  )
}

export function ThresholdCard({ draft, errors, onField }: DraftCardProps) {
  return (
    <Card className='gap-0 p-5 shadow-none'>
      <CardHeading title={id.settings.thresholds.title} />

      <div className='grid grid-cols-1 gap-6 @xl/content:grid-cols-2 @5xl/content:grid-cols-4'>
        {GROUPS.map((group, index) => (
          <Group
            key={group.name}
            title={id.settings.thresholds.groups[group.name]}
            divided={index > 0}
          >
            <NumberField
              fieldId={`setting-${group.low}`}
              label={id.settings.thresholds.min}
              value={draft[group.low]}
              error={errors[group.low]}
              decimal
              onChange={(value) => onField(group.low, value)}
            />
            <NumberField
              fieldId={`setting-${group.high}`}
              label={id.settings.thresholds.max}
              value={draft[group.high]}
              error={errors[group.high]}
              decimal
              onChange={(value) => onField(group.high, value)}
            />
          </Group>
        ))}

        <Group title={id.settings.thresholds.groups.sensor} divided>
          <NumberField
            fieldId='setting-sensorStaleSeconds'
            label={id.settings.thresholds.sensorStale}
            value={draft.sensorStaleSeconds}
            error={errors.sensorStaleSeconds}
            onChange={(value) => onField('sensorStaleSeconds', value)}
          />
        </Group>
      </div>
    </Card>
  )
}
