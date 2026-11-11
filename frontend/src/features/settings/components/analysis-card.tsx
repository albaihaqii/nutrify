import { id } from '@/locales/id'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { type NumericKey } from '../data/settings'
import { formatDuration } from '../lib/settings-form'
import { CardHeading } from './card-heading'
import { NumberField } from './number-field'
import { type DraftCardProps } from './threshold-card'

interface IntervalSelectProps {
  fieldId: string
  label: string
  value: string
  options: number[]
  onChange: (value: string) => void
}

function IntervalSelect({
  fieldId,
  label,
  value,
  options,
  onChange,
}: IntervalSelectProps) {
  return (
    <div className='flex flex-col gap-1.5'>
      <Label htmlFor={fieldId}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={fieldId} className='w-full'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={String(option)}>
              {id.settings.analysis.every.replace(
                '{value}',
                formatDuration(option)
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

interface AnalysisCardProps extends DraftCardProps {
  analysisOptions: number[]
  storeOptions: number[]
  onConsensus: (enabled: boolean) => void
}

export function AnalysisCard({
  draft,
  errors,
  analysisOptions,
  storeOptions,
  onField,
  onConsensus,
}: AnalysisCardProps) {
  function field(key: NumericKey) {
    return (value: string) => onField(key, value)
  }

  return (
    <Card className='gap-0 p-5 shadow-none'>
      <CardHeading title={id.settings.analysis.title} />

      <div className='flex flex-1 flex-col gap-4'>
        <IntervalSelect
          fieldId='setting-analysisIntervalSeconds'
          label={id.settings.analysis.interval}
          value={draft.analysisIntervalSeconds}
          options={analysisOptions}
          onChange={field('analysisIntervalSeconds')}
        />
        <IntervalSelect
          fieldId='setting-observationStoreIntervalSeconds'
          label={id.settings.analysis.storeInterval}
          value={draft.observationStoreIntervalSeconds}
          options={storeOptions}
          onChange={field('observationStoreIntervalSeconds')}
        />

        <div className='flex flex-col gap-2'>
          <div className='grid grid-cols-2 gap-3'>
            <NumberField
              fieldId='setting-stabilizerWindow'
              label={id.settings.analysis.stabilizerWindow}
              value={draft.stabilizerWindow}
              error={errors.stabilizerWindow}
              onChange={field('stabilizerWindow')}
            />
            <NumberField
              fieldId='setting-stabilizerMinVotes'
              label={id.settings.analysis.stabilizerVotes}
              value={draft.stabilizerMinVotes}
              error={errors.stabilizerMinVotes}
              onChange={field('stabilizerMinVotes')}
            />
          </div>
          <p className='text-sm text-muted-foreground'>
            {id.settings.analysis.stabilizerHint}
          </p>
        </div>

        <div className='mt-auto flex items-start justify-between gap-4 border-t pt-4'>
          <div>
            <Label htmlFor='setting-consensus' className='font-semibold'>
              {id.settings.analysis.consensus}
            </Label>
            <p className='text-sm text-muted-foreground'>
              {id.settings.analysis.consensusDesc}
            </p>
          </div>
          <Switch
            id='setting-consensus'
            checked={draft.consensusEnabled}
            onCheckedChange={onConsensus}
          />
        </div>
      </div>
    </Card>
  )
}
