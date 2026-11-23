import { id } from '@/locales/id'
import { formatNumber } from '@/lib/format'
import { plantStatusIcon } from '@/lib/plant-status'
import { StatusBadge } from '@/components/status-badge'
import { labelStatus } from '@/features/dataset/data/dataset'
import {
  LOW_CONFIDENCE_THRESHOLD,
  type ModelId,
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

export function PredictionResult({
  result,
  modelId,
}: {
  result: Result
  /** The primary model the result comes from. */
  modelId: ModelId
}) {
  const lowConfidence = result.confidence < LOW_CONFIDENCE_THRESHOLD
  const status = lowConfidence ? 'check' : labelStatus[result.label]
  const Icon = plantStatusIcon[status]

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex flex-wrap items-center gap-x-3 gap-y-2'>
        <span className='text-muted-foreground'>
          {id.models.predict.result.replace(
            '{model}',
            id.models.names[modelId]
          )}
        </span>
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
      </div>
      <p className='text-muted-foreground'>{agreementText(result)}</p>
      <p className='text-xs text-muted-foreground tabular-nums'>
        {id.models.predict.measured}:{' '}
        {result.features
          .map(
            ({ key, value }) =>
              `${id.models.features[key]} ${formatNumber(value, 1)}`
          )
          .join(' · ')}
        {' · '}
        {id.models.predict.leafArea.replace(
          '{percent}',
          formatPercent(result.leafArea)
        )}
      </p>
    </div>
  )
}
