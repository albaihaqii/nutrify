import { describe, expect, it } from 'vitest'
import {
  type IdealRanges,
  type LatestReading,
  type SensorSample,
} from '@/features/sensors/data/sensors'
import { buildKpiMetrics, pickSpark, sparkRangeOf } from './kpi'

const ideal: IdealRanges = {
  ph: [5.5, 6.5],
  ec: [1.5, 2],
  tds: [750, 1000],
  temperature: [18, 26],
}

const latest: LatestReading = {
  recordedAt: 0,
  isStale: false,
  values: { ph: 6.1, ec: 1.72, tds: 860, temperature: 24.6 },
}

const sample = (ph: number, ec: number): SensorSample => ({
  at: '2026-11-05T02:35:00.000Z',
  ph,
  ec,
  tds: Math.round(ec * 500),
  temperature: 24,
})

describe('pickSpark', () => {
  it('keeps short lists as they are', () => {
    expect(pickSpark([1, 2, 3])).toEqual([1, 2, 3])
  })

  it('spreads long lists evenly, first and last included', () => {
    const values = Array.from({ length: 60 }, (_, index) => index)
    const picked = pickSpark(values, 5)
    expect(picked).toHaveLength(5)
    expect(picked[0]).toBe(0)
    expect(picked[4]).toBe(59)
  })
})

describe('sparkRangeOf', () => {
  it('pads the range so a flat line still has height', () => {
    const [min, max] = sparkRangeOf([6, 6, 6], [4, 8])
    expect(min).toBeLessThan(6)
    expect(max).toBeGreaterThan(6)
  })
})

describe('buildKpiMetrics', () => {
  it('builds the four cards in order with the ideal ranges', () => {
    const metrics = buildKpiMetrics(latest, ideal, [])
    expect(metrics.map((metric) => metric.key)).toEqual([
      'ph',
      'ec',
      'tds',
      'temperature',
    ])
    expect(metrics[0].ideal).toEqual([5.5, 6.5])
    expect(metrics[2].ideal).toEqual([750, 1000])
  })

  it('measures the change against the start of the last hour', () => {
    const metrics = buildKpiMetrics(latest, ideal, [
      sample(5.9, 1.78),
      sample(6, 1.75),
    ])
    expect(metrics[0].delta).toBeCloseTo(0.2, 5)
    expect(metrics[1].delta).toBeCloseTo(-0.06, 5)
  })

  it('has no change and a one point sparkline without history', () => {
    const [ph] = buildKpiMetrics(latest, ideal, [])
    expect(ph.delta).toBe(0)
    expect(ph.spark).toEqual([6.1])
  })

  it('ends the sparkline with the newest value', () => {
    const [ph] = buildKpiMetrics(latest, ideal, [sample(5.9, 1.78)])
    expect(ph.spark).toEqual([5.9, 6.1])
  })
})
