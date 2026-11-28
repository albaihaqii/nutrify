import { describe, expect, it } from 'vitest'
import { type PlantDetailResponse } from '../data/plants'
import { toPlantDetail, toPlantSummaries } from './plants'

describe('toPlantSummaries', () => {
  it('maps a hole to its card, with the result its picture comes from', () => {
    const plants = toPlantSummaries({
      items: [
        {
          position: 3,
          status: 'fe_deficiency',
          last_observation: {
            id: 12,
            observed_at: '2026-11-20T01:00:00.000Z',
            confidence: 0.8,
          },
        },
      ],
    })

    expect(plants).toEqual([
      {
        id: 'L3',
        status: 'fe',
        confidence: 0.8,
        updatedAt: '2026-11-20T01:00:00.000Z',
        observationId: 12,
      },
    ])
  })

  it('leaves out holes without a result or outside 1 to 6', () => {
    const plants = toPlantSummaries({
      items: [
        { position: 1, status: null, last_observation: null },
        {
          position: 9,
          status: 'normal',
          last_observation: { id: 1, observed_at: '', confidence: null },
        },
      ],
    })

    expect(plants).toEqual([])
  })
})

describe('toPlantDetail', () => {
  const response = (
    status: string,
    overrides: Partial<PlantDetailResponse['latest_observation']> = {}
  ): PlantDetailResponse => ({
    position: 2,
    status,
    latest_observation: {
      id: 5,
      observed_at: '2026-11-20T01:00:00.000Z',
      confidence: 0.91,
      has_image: true,
      rule_path: [{ feature: 'mean_r', operator: '<=', threshold: 144.55 }],
      features: { mean_r: 92.3, mean_g: 103.9, mean_b: 53.6 },
      ...overrides,
    },
    status_history: [
      { since: '2026-11-20T00:00:00.000Z', status: 'normal', confidence: 0.7 },
    ],
  })

  it('writes the path of a class with its conclusion', () => {
    const detail = toPlantDetail(response('normal'))

    expect(detail?.path).toEqual(['Mean_R ≤ 144,55', '→ Normal'])
    expect(detail?.mean).toEqual({ r: 92.3, g: 103.9, b: 53.6 })
    expect(detail?.history).toEqual([
      { at: '2026-11-20T00:00:00.000Z', status: 'ok', confidence: 0.7 },
    ])
  })

  it('has no path when the plant needs a check or is not detected', () => {
    expect(toPlantDetail(response('needs_check'))?.path).toEqual([])
    expect(toPlantDetail(response('no_plant'))?.path).toEqual([])
  })

  it('has no mean colour when there was no leaf', () => {
    const detail = toPlantDetail(
      response('no_plant', {
        features: { mean_r: null, mean_g: null, mean_b: null },
      })
    )

    expect(detail?.mean).toBeNull()
  })
})
