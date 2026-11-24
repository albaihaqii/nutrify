import { describe, expect, it } from 'vitest'
import { type IdealRanges, type SensorSample } from '../data/sensors'
import { issuesOf } from './metrics'

const ideal: IdealRanges = {
  ph: [5.5, 6.5],
  ec: [1.5, 2.5],
  tds: [750, 1250],
  temperature: [18, 26],
}

const sample = (values: Partial<SensorSample>): SensorSample => ({
  at: '2026-11-24T03:00:00.000Z',
  ph: 6,
  ec: 2,
  tds: 1000,
  temperature: 22,
  ...values,
})

describe('issuesOf', () => {
  it('returns nothing when every value is ideal', () => {
    expect(issuesOf(sample({}), ideal)).toEqual([])
  })

  it('lists one issue per parameter, with its direction', () => {
    expect(
      issuesOf(sample({ ph: 5.2, ec: 2.8, temperature: 27 }), ideal)
    ).toEqual([
      { metric: 'ph', level: 'low' },
      { metric: 'ec', level: 'high' },
      { metric: 'temperature', level: 'high' },
    ])
  })

  it('reports EC and TDS once', () => {
    expect(issuesOf(sample({ ec: 2.8, tds: 1400 }), ideal)).toEqual([
      { metric: 'ec', level: 'high' },
    ])
  })
})
