import { api } from '@/lib/api'
import {
  NUMERIC_KEYS,
  type NumericKey,
  type SettingsValues,
} from '../data/settings'
import { sortBoxes, type RoiBox } from '../lib/roi'

// Shape returned by the backend (docs/API.md, section 14).
interface SettingsDto {
  ph_min: number
  ph_max: number
  ec_min: number
  ec_max: number
  temperature_min: number
  temperature_max: number
  analysis_interval_seconds: number
  observation_store_interval_seconds: number
  stabilizer_window: number
  stabilizer_min_votes: number
  sensor_stale_seconds: number
  consensus_enabled: boolean
  roi_config: RoiBox[]
}

type NumericDtoKey = Exclude<
  keyof SettingsDto,
  'consensus_enabled' | 'roi_config'
>

const KEY_MAP: Record<NumericKey, NumericDtoKey> = {
  phMin: 'ph_min',
  phMax: 'ph_max',
  ecMin: 'ec_min',
  ecMax: 'ec_max',
  temperatureMin: 'temperature_min',
  temperatureMax: 'temperature_max',
  sensorStaleSeconds: 'sensor_stale_seconds',
  analysisIntervalSeconds: 'analysis_interval_seconds',
  observationStoreIntervalSeconds: 'observation_store_interval_seconds',
  stabilizerWindow: 'stabilizer_window',
  stabilizerMinVotes: 'stabilizer_min_votes',
}

function toSettings(dto: SettingsDto): SettingsValues {
  const numbers = {} as Record<NumericKey, number>
  for (const key of NUMERIC_KEYS) numbers[key] = dto[KEY_MAP[key]]
  return {
    ...numbers,
    consensusEnabled: dto.consensus_enabled,
    roi: sortBoxes(dto.roi_config),
  }
}

export async function fetchSettings(): Promise<SettingsValues> {
  const { data } = await api.get<SettingsDto>('/settings')
  return toSettings(data)
}

export async function updateSettings(
  patch: Partial<SettingsValues>
): Promise<SettingsValues> {
  const body: Partial<Record<NumericDtoKey, number>> & {
    consensus_enabled?: boolean
    roi_config?: RoiBox[]
  } = {}

  for (const key of NUMERIC_KEYS) {
    const value = patch[key]
    if (value !== undefined) body[KEY_MAP[key]] = value
  }
  if (patch.consensusEnabled !== undefined) {
    body.consensus_enabled = patch.consensusEnabled
  }
  if (patch.roi !== undefined) body.roi_config = sortBoxes(patch.roi)

  const { data } = await api.put<SettingsDto>('/settings', body)
  return toSettings(data)
}
