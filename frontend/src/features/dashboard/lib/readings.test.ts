import { describe, expect, it } from 'vitest'
import { toDailyConditions, toObservations, toPlantReadings } from './readings'

describe('toPlantReadings', () => {
  it('maps the API statuses and takes the confidence of the last observation', () => {
    const readings = toPlantReadings({
      items: [
        {
          position: 1,
          status: 'normal',
          last_observation: { confidence: 0.72 },
        },
        { position: 2, status: 'no_plant', last_observation: null },
        { position: 3, status: 'needs_check', last_observation: null },
      ],
    })

    expect(readings).toEqual([
      { position: 1, status: 'ok', confidence: 0.72 },
      { position: 2, status: 'none', confidence: null },
      { position: 3, status: 'check', confidence: null },
    ])
  })

  it('leaves out holes without a status or outside 1 to 6', () => {
    const readings = toPlantReadings({
      items: [
        { position: 1, status: null, last_observation: null },
        { position: 7, status: 'normal', last_observation: null },
      ],
    })

    expect(readings).toEqual([])
  })
})

describe('toDailyConditions', () => {
  const day = (start: string, normal: number) => ({
    start,
    normal,
    n_deficiency: 0,
    fe_deficiency: 0,
    needs_check: 0,
  })

  it('keeps every day once any hole is counted', () => {
    const days = toDailyConditions({
      items: [
        day('2026-11-20T00:00:00.000Z', 0),
        day('2026-11-21T00:00:00.000Z', 4),
      ],
    })

    expect(days).toHaveLength(2)
    expect(days[1]).toMatchObject({ ok: 4, n: 0, fe: 0, check: 0 })
  })

  it('is empty when no day has a counted hole', () => {
    expect(
      toDailyConditions({ items: [day('2026-11-20T00:00:00.000Z', 0)] })
    ).toEqual([])
  })
})

describe('toObservations', () => {
  it('maps a row and keeps missing sensor values as null', () => {
    const rows = toObservations({
      items: [
        {
          id: 9,
          plant_position: 3,
          observed_at: '2026-11-20T01:00:00.000Z',
          status: 'fe_deficiency',
          confidence: 0.8,
          features: { ph: null, ec: 1.72, temperature: null },
        },
      ],
    })

    expect(rows).toEqual([
      {
        id: 9,
        observedAt: '2026-11-20T01:00:00.000Z',
        position: 3,
        status: 'fe',
        confidence: 0.8,
        ph: null,
        ec: 1.72,
        temperature: null,
      },
    ])
  })
})
