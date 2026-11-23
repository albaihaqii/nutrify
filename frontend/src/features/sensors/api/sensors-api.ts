import { AxiosError } from 'axios'
import { api } from '@/lib/api'
import {
  type IdealRanges,
  type LatestReading,
  type SensorRange,
  type SensorSample,
  type SensorSettings,
} from '../data/sensors'

// Shapes returned by the backend (docs/API.md, sections 5 and 14).
type Interval = 'raw' | '1m' | '5m' | '1h'

interface HistoryItemDto {
  time: string
  ph: number
  ec: number
  tds_ppm: number
  temperature: number
}

interface LatestDto {
  recorded_at: string
  is_stale: boolean
  ph: { value: number }
  ec: { value: number }
  tds_ppm: { value: number }
  temperature: { value: number }
}

interface SettingsDto {
  ph_min: number
  ph_max: number
  ec_min: number
  ec_max: number
  temperature_min: number
  temperature_max: number
  sensor_stale_seconds: number
}

/** Window and bucket size per range; every one stays below the 2,000 point limit. */
export const RANGE_QUERY: Record<
  SensorRange,
  { hours: number; interval: Interval }
> = {
  '1h': { hours: 1, interval: '1m' },
  '24h': { hours: 24, interval: '5m' },
  '7d': { hours: 168, interval: '1h' },
}

/** The sensor has no TDS limits of its own: they follow EC (ppm = EC x 500). */
const PPM_PER_MS_CM = 500

export function toSample(dto: HistoryItemDto): SensorSample {
  return {
    at: dto.time,
    ph: dto.ph,
    ec: dto.ec,
    tds: dto.tds_ppm,
    temperature: dto.temperature,
  }
}

export function toLatest(dto: LatestDto): LatestReading {
  return {
    recordedAt: new Date(dto.recorded_at).getTime(),
    isStale: dto.is_stale,
    values: {
      ph: dto.ph.value,
      ec: dto.ec.value,
      tds: dto.tds_ppm.value,
      temperature: dto.temperature.value,
    },
  }
}

export function toSensorSettings(dto: SettingsDto): SensorSettings {
  const ideal: IdealRanges = {
    ph: [dto.ph_min, dto.ph_max],
    ec: [dto.ec_min, dto.ec_max],
    tds: [dto.ec_min * PPM_PER_MS_CM, dto.ec_max * PPM_PER_MS_CM],
    temperature: [dto.temperature_min, dto.temperature_max],
  }
  return { ideal, staleSeconds: dto.sensor_stale_seconds }
}

/** The newest reading, or null when the sensor has never sent one. */
export async function fetchLatest(): Promise<LatestReading | null> {
  try {
    const { data } = await api.get<LatestDto>('/sensor-readings/latest')
    return toLatest(data)
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status === 404) {
      return null
    }
    throw error
  }
}

/** Readings of a range, oldest first, averaged per bucket. */
export async function fetchHistory(
  range: SensorRange,
  now: number = Date.now()
): Promise<SensorSample[]> {
  const { hours, interval } = RANGE_QUERY[range]
  const { data } = await api.get<{ items: HistoryItemDto[] }>(
    '/sensor-readings',
    {
      params: {
        from: new Date(now - hours * 3_600_000).toISOString(),
        to: new Date(now).toISOString(),
        interval,
      },
    }
  )
  return data.items.map(toSample)
}

export async function fetchSensorSettings(): Promise<SensorSettings> {
  const { data } = await api.get<SettingsDto>('/settings')
  return toSensorSettings(data)
}
