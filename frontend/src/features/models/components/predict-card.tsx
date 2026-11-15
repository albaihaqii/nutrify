import { useState, type FormEvent } from 'react'
import { id } from '@/locales/id'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/empty-state'
import { QueryBoundary } from '@/components/query-boundary'
import { useModelReport, usePredict } from '../api/models-queries'
import { exampleInput, featureKeys, type FeatureKey } from '../data/models'
import {
  toDraft,
  validateDraft,
  type PredictDraft,
  type PredictErrors,
} from '../lib/predict-form'
import { ModelCard } from './model-card'
import { PredictionResult } from './prediction-result'

const FIELDS_GRID =
  'grid grid-cols-2 gap-4 @xl/content:grid-cols-3 @5xl/content:grid-cols-6'

function PredictForm() {
  const predict = usePredict()
  const [draft, setDraft] = useState<PredictDraft>(() => toDraft(exampleInput))
  const [errors, setErrors] = useState<PredictErrors>({})

  // An edited form no longer matches the result next to it.
  function handleChange(key: FeatureKey, value: string) {
    setDraft((previous) => ({ ...previous, [key]: value }))
    setErrors((previous) => {
      const next = { ...previous }
      delete next[key]
      return next
    })
    predict.reset()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validation = validateDraft(draft)
    if (!validation.ok) {
      setErrors(validation.errors)
      return
    }
    predict.mutate(validation.values)
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className={FIELDS_GRID}>
        {featureKeys.map((key) => {
          const fieldId = `predict-${key}`
          const error = errors[key]
          return (
            <div key={key} className='flex flex-col gap-1.5'>
              <Label htmlFor={fieldId} className='text-[13px] font-semibold'>
                {id.models.features[key].field}
              </Label>
              <Input
                id={fieldId}
                value={draft[key]}
                inputMode='decimal'
                autoComplete='off'
                aria-invalid={error !== undefined}
                aria-describedby={error ? `${fieldId}-error` : undefined}
                className='h-10 tabular-nums'
                onChange={(event) => handleChange(key, event.target.value)}
              />
              {error && (
                <p id={`${fieldId}-error`} className='text-xs text-destructive'>
                  {error}
                </p>
              )}
            </div>
          )
        })}
      </div>

      <div className='mt-4 flex flex-wrap items-center gap-x-4 gap-y-3'>
        <Button type='submit' disabled={predict.isPending}>
          {id.models.predict.submit}
        </Button>
        <div aria-live='polite'>
          {predict.data && <PredictionResult result={predict.data} />}
        </div>
      </div>
    </form>
  )
}

export function PredictCard() {
  const query = useModelReport()

  return (
    <ModelCard title={id.models.predict.title}>
      <QueryBoundary
        query={query}
        skeleton={<Skeleton className='h-[120px] w-full' />}
        empty={{
          when: (data) => data.models.length === 0,
          view: <EmptyState title={id.models.empty} />,
        }}
      >
        {() => <PredictForm />}
      </QueryBoundary>
    </ModelCard>
  )
}
