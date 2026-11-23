import { describe, expect, it } from 'vitest'
import {
  RANGE_QUERY,
  toLatest,
  toSample,
  toSensorSettings,
} from './sensors-api'

describe('toSample', () => {
  it('renames the API fields', () => {
    expect(
      toSample({
        time: '2026-11-05T02:35:00.000Z',
        ph: 6.1,
        ec: 1.83,
        tds_ppm: 915,
        temperature: 24.5,
      })
    ).toEqual({
      at: '2026-11-05T02:35:00.000Z',
      ph: 6.1,
      ec: 1.83,
      tds: 915,
      temperature: 24.5,
    })
  })
})

describe('toLatest', () => {
  it('keeps the measuring time in milliseconds', () => {
    const latest = toLatest({
      recorded_at: '2026-11-05T02:40:00.000Z',
      is_stale: false,
      ph: { value: 6.12 },
      ec: { value: 1.84 },
      tds_ppm: { value: 920 },
      temperature: { value: 24.6 },
    })
    expect(latest.recordedAt).toBe(Date.parse('2026-11-05T02:40:00.000Z'))
    expect(latest.isStale).toBe(false)
    expect(latest.values).toEqual({
      ph: 6.12,
      ec: 1.84,
      tds: 920,
      temperature: 24.6,
    })
  })
})

describe('toSensorSettings', () => {
  it('derives the TDS range from EC (ppm = EC x 500)', () => {
    const settings = toSensorSettings({
      ph_min: 5.5,
      ph_max: 6.5,
      ec_min: 1.5,
      ec_max: 2,
      temperature_min: 18,
      temperature_max: 26,
      sensor_stale_seconds: 120,
    })
    expect(settings.ideal).toEqual({
      ph: [5.5, 6.5],
      ec: [1.5, 2],
      tds: [750, 1000],
      temperature: [18, 26],
    })
    expect(settings.staleSeconds).toBe(120)
  })
})

describe('RANGE_QUERY', () => {
  it('keeps every range below the 2,000 point limit of the API', () => {
    const minutes = { raw: 0, '1m': 1, '5m': 5, '1h': 60 }
    for (const { hours, interval } of Object.values(RANGE_QUERY)) {
      expect((hours * 60) / minutes[interval]).toBeLessThanOrEqual(2000)
    }
  })
})
