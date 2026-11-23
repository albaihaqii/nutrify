import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { id } from '@/locales/id'
import { ImagePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/empty-state'
import { QueryBoundary } from '@/components/query-boundary'
import { useModelReport, usePredict } from '../api/models-queries'
import { type ModelId } from '../data/models'
import { imageProblem } from '../lib/image-file'
import { primaryModelId } from '../lib/primary'
import { ModelCard } from './model-card'
import { PredictionResult } from './prediction-result'

interface Picked {
  file: File
  /** Object URL of the photo, for the preview. */
  url: string
}

function PredictForm({ modelId }: { modelId: ModelId }) {
  const predict = usePredict()
  const inputRef = useRef<HTMLInputElement>(null)
  const [picked, setPicked] = useState<Picked | null>(null)
  const [problem, setProblem] = useState<string | null>(null)

  const previewUrl = picked?.url
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    },
    [previewUrl]
  )

  // A new photo no longer matches the result next to it.
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    predict.reset()
    const found = imageProblem(file)
    if (found) {
      setProblem(id.models.errors[found])
      return
    }
    setProblem(null)
    setPicked({ file, url: URL.createObjectURL(file) })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (picked) predict.mutate(picked.file)
  }

  return (
    <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
      <p className='text-muted-foreground'>{id.models.predict.hint}</p>

      <div className='flex flex-wrap items-start gap-4'>
        <div className='flex size-32 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed bg-muted/40'>
          {picked ? (
            <img
              src={picked.url}
              alt={id.models.predict.previewAlt}
              className='size-full object-cover'
            />
          ) : (
            <ImagePlus
              aria-hidden='true'
              className='size-6 text-muted-foreground'
            />
          )}
        </div>

        <div className='flex min-w-0 flex-1 flex-col gap-3'>
          <input
            ref={inputRef}
            type='file'
            accept='image/*'
            hidden
            onChange={handleChange}
          />
          <div className='flex flex-wrap items-center gap-3'>
            <Button
              type='button'
              variant='outline'
              onClick={() => inputRef.current?.click()}
            >
              {picked ? id.models.predict.change : id.models.predict.choose}
            </Button>
            <Button type='submit' disabled={!picked || predict.isPending}>
              {predict.isPending
                ? id.models.predict.predicting
                : id.models.predict.submit}
            </Button>
          </div>

          {problem && (
            <p role='alert' className='text-xs text-destructive'>
              {problem}
            </p>
          )}
          <div aria-live='polite'>
            {predict.data && (
              <PredictionResult result={predict.data} modelId={modelId} />
            )}
          </div>
        </div>
      </div>
    </form>
  )
}

export function PredictCard() {
  const query = useModelReport()
  const modelId = primaryModelId(query.data)

  return (
    <ModelCard title={id.models.predict.title}>
      <QueryBoundary
        query={query}
        skeleton={<Skeleton className='h-[160px] w-full' />}
        empty={{
          when: (data) => data.models.length === 0,
          view: <EmptyState title={id.models.empty} />,
        }}
      >
        {() => (modelId ? <PredictForm modelId={modelId} /> : null)}
      </QueryBoundary>
    </ModelCard>
  )
}
