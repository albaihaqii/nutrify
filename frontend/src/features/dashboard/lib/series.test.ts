import { describe, expect, it } from 'vitest'
import { type SensorHistory } from '@/features/sensors/data/sensors'
import { pickTicks, toSeries } from './series'

describe('pickTicks', () => {
  it('returns short lists without repeats', () => {
    expect(pickTicks(['a', 'b', 'a'])).toEqual(['a', 'b'])
  })

  it('spreads long lists evenly, first and last included', () => {
    const labels = Array.from({ length: 9 }, (_, index) => `t${index}`)
    expect(pickTicks(labels, 5)).toEqual(['t0', 't2', 't4', 't6', 't8'])
  })
})

describe('toSeries', () => {
  const history: SensorHistory = {
    samples: [
      {
        at: '2026-11-05T02:35:00.000Z',
        ph: 6.1,
        ec: 1.83,
        tds: 915,
        temperature: 24.5,
      },
      {
        at: '2026-11-05T02:40:00.000Z',
        ph: 6.2,
        ec: 1.8,
        tds: 900,
        temperature: 24.6,
      },
    ],
    ideal: {
      ph: [5.5, 6.5],
      ec: [1.5, 2],
      tds: [750, 1000],
      temperature: [18, 26],
    },
  }

  it('keeps pH and EC and the ideal ranges of the settings', () => {
    const series = toSeries('24h', history)
    expect(series.points.map((point) => point.ph)).toEqual([6.1, 6.2])
    expect(series.points.map((point) => point.ec)).toEqual([1.83, 1.8])
    expect(series.ideal).toEqual({ ph: [5.5, 6.5], ec: [1.5, 2] })
  })

  it('gives every point a label and picks the ticks from them', () => {
    const series = toSeries('1h', history)
    expect(series.points[0].label).toMatch(/^\d{2}:\d{2}$/)
    expect(series.ticks).toEqual(series.points.map((point) => point.label))
  })
})
