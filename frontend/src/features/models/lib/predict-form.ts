import { id } from '@/locales/id'
import { formatDecimal, parseDecimal } from '@/features/settings/lib/decimal'
import {
  featureKeys,
  featureRange,
  type FeatureKey,
  type FeatureValues,
} from '../data/models'

export type PredictDraft = Record<FeatureKey, string>
export type PredictErrors = Partial<Record<FeatureKey, string>>

export function toDraft(values: FeatureValues): PredictDraft {
  const draft = {} as PredictDraft
  for (const key of featureKeys) draft[key] = formatDecimal(values[key])
  return draft
}

type PredictValidation =
  | { ok: true; values: FeatureValues }
  | { ok: false; errors: PredictErrors }

export function validateDraft(draft: PredictDraft): PredictValidation {
  const values = {} as FeatureValues
  const errors: PredictErrors = {}

  for (const key of featureKeys) {
    const value = parseDecimal(draft[key])
    const { min, max } = featureRange[key]

    if (value === null) {
      errors[key] = id.models.predict.errors.number
    } else if (value < min || value > max) {
      errors[key] = id.models.predict.errors.range
        .replace('{min}', formatDecimal(min))
        .replace('{max}', formatDecimal(max))
    } else {
      values[key] = value
    }
  }

  return Object.keys(errors).length > 0
    ? { ok: false, errors }
    : { ok: true, values }
}
