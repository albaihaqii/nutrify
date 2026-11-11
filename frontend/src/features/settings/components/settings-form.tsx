import { useState, type FormEvent } from 'react'
import { id } from '@/locales/id'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useUpdateSettings } from '../api/settings-queries'
import {
  ANALYSIS_INTERVALS,
  STORE_INTERVALS,
  type DraftErrors,
  type NumericKey,
  type SettingsDraft,
  type SettingsValues,
} from '../data/settings'
import { defaultBoxes } from '../lib/roi'
import {
  diffSettings,
  draftsEqual,
  intervalOptions,
  toDraft,
  validateDraft,
} from '../lib/settings-form'
import { AnalysisCard } from './analysis-card'
import { CalibrationCard } from './calibration-card'
import { SettingsHeader } from './settings-header'
import { ThresholdCard } from './threshold-card'

interface SettingsFormProps {
  settings: SettingsValues
  isAdmin: boolean
}

export function SettingsForm({ settings, isAdmin }: SettingsFormProps) {
  const update = useUpdateSettings()
  const [draft, setDraft] = useState<SettingsDraft>(() => toDraft(settings))
  const [errors, setErrors] = useState<DraftErrors>({})

  const saved = toDraft(settings)
  const dirty = !draftsEqual(draft, saved)

  function handleField(key: NumericKey, value: string) {
    setDraft((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  function handleCancel() {
    setDraft(saved)
    setErrors({})
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()

    const result = validateDraft(draft)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }

    const patch = diffSettings(settings, result.values)
    if (Object.keys(patch).length === 0) return

    update.mutate(patch, {
      onSuccess: (next) => {
        setDraft(toDraft(next))
        setErrors({})
      },
    })
  }

  const actions = isAdmin ? (
    <>
      {dirty && (
        <Button
          type='button'
          variant='outline'
          className='h-10'
          disabled={update.isPending}
          onClick={handleCancel}
        >
          {id.settings.actions.cancel}
        </Button>
      )}
      <Button
        type='submit'
        className='h-10'
        disabled={!dirty || update.isPending}
      >
        {id.settings.actions.save}
      </Button>
    </>
  ) : null

  return (
    <form onSubmit={handleSubmit} noValidate className='flex flex-col gap-6'>
      <SettingsHeader actions={actions} />

      {!isAdmin && (
        <p className='text-muted-foreground'>{id.settings.readOnly}</p>
      )}

      <fieldset disabled={!isAdmin} className='flex min-w-0 flex-col gap-6'>
        <ThresholdCard draft={draft} errors={errors} onField={handleField} />

        <div
          className={cn(
            'grid grid-cols-1 gap-6',
            isAdmin && '@3xl/content:grid-cols-2'
          )}
        >
          <AnalysisCard
            draft={draft}
            errors={errors}
            onField={handleField}
            analysisOptions={intervalOptions(
              ANALYSIS_INTERVALS,
              settings.analysisIntervalSeconds
            )}
            storeOptions={intervalOptions(
              STORE_INTERVALS,
              settings.observationStoreIntervalSeconds
            )}
            onConsensus={(enabled) =>
              setDraft((current) => ({
                ...current,
                consensusEnabled: enabled,
              }))
            }
          />
          {isAdmin && (
            <CalibrationCard
              boxes={draft.roi}
              onChange={(roi) => setDraft((current) => ({ ...current, roi }))}
              onReset={() =>
                setDraft((current) => ({ ...current, roi: defaultBoxes() }))
              }
            />
          )}
        </div>
      </fieldset>
    </form>
  )
}
