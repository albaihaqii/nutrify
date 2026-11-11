import { type RoiBox } from '../lib/roi'

export const NUMERIC_KEYS = [
  'phMin',
  'phMax',
  'ecMin',
  'ecMax',
  'temperatureMin',
  'temperatureMax',
  'sensorStaleSeconds',
  'analysisIntervalSeconds',
  'observationStoreIntervalSeconds',
  'stabilizerWindow',
  'stabilizerMinVotes',
] as const

export type NumericKey = (typeof NUMERIC_KEYS)[number]

/** Saved settings, already converted from the API shape. */
export type SettingsValues = Record<NumericKey, number> & {
  consensusEnabled: boolean
  /** Six hole regions as fractions (0 to 1) of the camera frame. */
  roi: RoiBox[]
}

/** What the form holds while editing: numbers stay text until validated. */
export type SettingsDraft = Record<NumericKey, string> & {
  consensusEnabled: boolean
  roi: RoiBox[]
}

type DraftKey = NumericKey | 'roi'
export type DraftErrors = Partial<Record<DraftKey, string | undefined>>

/** Choices for the two interval selects; the saved value is added when missing. */
export const ANALYSIS_INTERVALS = [5, 10, 15, 30, 60] as const
export const STORE_INTERVALS = [30, 60, 120, 300, 600] as const
