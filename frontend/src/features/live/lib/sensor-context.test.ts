import { describe, expect, it } from 'vitest'
import {
  type IdealRanges,
  type LatestReading,
} from '@/features/sensors/data/sensors'
import { buildSensorContext } from './sensor-context'

const ideal: IdealRanges = {
  ph: [5.5, 6.5],
  ec: [1.5, 2],
  tds: [750, 1000],
  temperature: [18, 26],
}

const latest: LatestReading = {
  recordedAt: 0,
  isStale: false,
  values: { ph: 5.2, ec: 1.72, tds: 1100, temperature: 24.6 },
}

describe('buildSensorContext', () => {
  it('has no items before the first reading', () => {
    expect(buildSensorContext(null, ideal)).toEqual([])
  })

  it('marks each value low, ideal or high against the settings', () => {
    const items = buildSensorContext(latest, ideal)
    expect(items.map((item) => [item.key, item.level])).toEqual([
      ['ph', 'low'],
      ['ec', 'ideal'],
      ['tds', 'high'],
      ['temperature', 'ideal'],
    ])
  })

  it('carries the unit and decimals of each metric', () => {
    const items = buildSensorContext(latest, ideal)
    expect(items[1]).toMatchObject({ unit: 'mS/cm', decimals: 2 })
    expect(items[3]).toMatchObject({ unit: '°C', decimals: 1 })
  })
})
