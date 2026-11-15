import { id } from '@/locales/id'
import { plantStatusIcon } from '@/lib/plant-status'
import { StatusBadge } from '@/components/status-badge'
import { labelStatus } from '@/features/dataset/data/dataset'
import {
  LOW_CONFIDENCE_THRESHOLD,
  type PredictionResult as Result,
} from '../data/models'
import { formatPercent } from '../lib/format'

function agreementText({ label, comparators }: Result): string {
  const agreeing = comparators.filter((item) => item.label === label)
  const total = comparators.length

  if (agreeing.length === total) {
    return id.models.predict.allAgree
      .replace(
        '{names}',
        comparators.map((item) => id.models.shortNames[item.modelId]).join(', ')
      )
      .replace('{agree}', String(agreeing.length))
      .replace('{total}', String(total))
  }

  const different = comparators
    .filter((item) => item.label !== label)
    .map(
      (item) =>
        `${id.models.shortNames[item.modelId]} (${id.dataset.labels[item.label]})`
    )
    .join(', ')

  return id.models.predict.someAgree
    .replace('{agree}', String(agreeing.length))
    .replace('{total}', String(total))
    .replace('{names}', different)
}

export function PredictionResult({ result }: { result: Result }) {
  const lowConfidence = result.confidence < LOW_CONFIDENCE_THRESHOLD
  const status = lowConfidence ? 'check' : labelStatus[result.label]
  const Icon = plantStatusIcon[status]

  return (
    <div className='flex flex-wrap items-center gap-x-3 gap-y-2'>
      <span className='text-muted-foreground'>{id.models.predict.result}</span>
      <StatusBadge tone={status} dashed={lowConfidence}>
        <Icon aria-hidden='true' />
        {id.plantStatus[status]} · {formatPercent(result.confidence)}%
      </StatusBadge>
      {lowConfidence && (
        <span className='text-muted-foreground'>
          {id.models.predict.leaning.replace(
            '{label}',
            id.plantStatus[labelStatus[result.label]]
          )}
        </span>
      )}
      <span className='text-muted-foreground'>{agreementText(result)}</span>
    </div>
  )
}
