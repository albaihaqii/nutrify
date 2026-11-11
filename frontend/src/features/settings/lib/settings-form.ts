import { id } from '@/locales/id'
import {
  NUMERIC_KEYS,
  type DraftErrors,
  type NumericKey,
  type SettingsDraft,
  type SettingsValues,
} from '../data/settings'
import { formatDecimal, parseDecimal, parseInteger } from './decimal'
import { boxesEqual } from './roi'

interface Rule {
  integer: boolean
  min: number
  max: number
}

// Same limits as the backend (docs/API.md section 14), so most mistakes
// are caught here before a request is sent.
const RULES: Record<NumericKey, Rule> = {
  phMin: { integer: false, min: 0, max: 14 },
  phMax: { integer: false, min: 0, max: 14 },
  ecMin: { integer: false, min: 0, max: 10 },
  ecMax: { integer: false, min: 0, max: 10 },
  temperatureMin: { integer: false, min: -5, max: 60 },
  temperatureMax: { integer: false, min: -5, max: 60 },
  sensorStaleSeconds: { integer: true, min: 10, max: 3600 },
  analysisIntervalSeconds: { integer: true, min: 1, max: 3600 },
  observationStoreIntervalSeconds: { integer: true, min: 1, max: 86400 },
  stabilizerWindow: { integer: true, min: 1, max: 50 },
  stabilizerMinVotes: { integer: true, min: 1, max: 50 },
}

const RANGE_PAIRS: ReadonlyArray<readonly [NumericKey, NumericKey]> = [
  ['phMin', 'phMax'],
  ['ecMin', 'ecMax'],
  ['temperatureMin', 'temperatureMax'],
]

type ValidationResult =
  | { ok: true; values: SettingsValues }
  | { ok: false; errors: DraftErrors }

function toText(key: NumericKey, value: number): string {
  return RULES[key].integer ? String(value) : formatDecimal(value)
}

export function toDraft(values: SettingsValues): SettingsDraft {
  const numbers = {} as Record<NumericKey, string>
  for (const key of NUMERIC_KEYS) numbers[key] = toText(key, values[key])
  return {
    ...numbers,
    consensusEnabled: values.consensusEnabled,
    roi: values.roi,
  }
}

export function draftsEqual(a: SettingsDraft, b: SettingsDraft): boolean {
  return (
    NUMERIC_KEYS.every((key) => a[key] === b[key]) &&
    a.consensusEnabled === b.consensusEnabled &&
    boxesEqual(a.roi, b.roi)
  )
}

export function validateDraft(draft: SettingsDraft): ValidationResult {
  const errors: DraftErrors = {}
  const numbers = {} as Record<NumericKey, number>

  for (const key of NUMERIC_KEYS) {
    const rule = RULES[key]
    const parsed = rule.integer
      ? parseInteger(draft[key])
      : parseDecimal(draft[key])

    if (parsed === null) {
      errors[key] = rule.integer
        ? id.settings.errors.integer
        : id.settings.errors.number
    } else if (parsed < rule.min || parsed > rule.max) {
      errors[key] = id.settings.errors.range
        .replace('{min}', formatDecimal(rule.min))
        .replace('{max}', formatDecimal(rule.max))
    } else {
      numbers[key] = parsed
    }
  }

  for (const [low, high] of RANGE_PAIRS) {
    if (errors[low] || errors[high]) continue
    if (numbers[high] <= numbers[low]) {
      errors[high] = id.settings.errors.maxAboveMin
    }
  }

  if (
    !errors.stabilizerWindow &&
    !errors.stabilizerMinVotes &&
    numbers.stabilizerMinVotes > numbers.stabilizerWindow
  ) {
    errors.stabilizerMinVotes = id.settings.errors.votes
  }

  if (Object.values(errors).some(Boolean)) return { ok: false, errors }

  return {
    ok: true,
    values: {
      ...numbers,
      consensusEnabled: draft.consensusEnabled,
      roi: draft.roi,
    },
  }
}

/** Only what changed, so the backend receives a partial update. */
export function diffSettings(
  saved: SettingsValues,
  next: SettingsValues
): Partial<SettingsValues> {
  const patch: Partial<SettingsValues> = {}
  for (const key of NUMERIC_KEYS) {
    if (saved[key] !== next[key]) patch[key] = next[key]
  }
  if (saved.consensusEnabled !== next.consensusEnabled) {
    patch.consensusEnabled = next.consensusEnabled
  }
  if (!boxesEqual(saved.roi, next.roi)) patch.roi = next.roi
  return patch
}

/** Preset choices plus the saved value when it is not among them. */
export function intervalOptions(
  presets: readonly number[],
  current: number
): number[] {
  const all = presets.includes(current) ? [...presets] : [...presets, current]
  return all.sort((a, b) => a - b)
}

/** 30 becomes "30 detik", 120 becomes "2 menit". */
export function formatDuration(seconds: number): string {
  if (seconds >= 60 && seconds % 60 === 0) {
    return `${seconds / 60} ${id.settings.units.minutes}`
  }
  return `${seconds} ${id.settings.units.seconds}`
}
