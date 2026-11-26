import { describe, expect, it } from 'vitest'
import { type AnalysisResponse } from '../data/live-analysis'
import { toLiveAnalysis } from './analysis'

type ApiPlant = AnalysisResponse['plants'][number]

function plant(overrides: Partial<ApiPlant> = {}): ApiPlant {
  return {
    position: 1,
    status: 'normal',
    confidence: 0.72,
    observed: 'normal',
    predicted: 'normal',
    rule_path: [
      { feature: 'mean_r', operator: '<=', threshold: 144.55 },
      { feature: 'mean_r', operator: '>', threshold: 95.75 },
    ],
    comparators: [],
    ...overrides,
  }
}

function analysis(...plants: ApiPlant[]): AnalysisResponse {
  return { analyzed_at: '2026-11-26T02:00:00.000Z', plants }
}

describe('toLiveAnalysis', () => {
  it('has no plants and no time while the worker has not analysed', () => {
    expect(toLiveAnalysis({ analyzed_at: null, plants: [] })).toEqual({
      analyzedAt: null,
      plants: [],
      comparators: [],
    })
  })

  it('reads the time as UTC', () => {
    expect(toLiveAnalysis(analysis()).analyzedAt?.toISOString()).toBe(
      '2026-11-26T02:00:00.000Z'
    )
  })

  it('maps the classes of the API to the statuses of the UI', () => {
    const statuses = toLiveAnalysis(
      analysis(
        plant({ position: 1, status: 'normal', observed: 'normal' }),
        plant({
          position: 2,
          status: 'n_deficiency',
          observed: 'n_deficiency',
        }),
        plant({
          position: 3,
          status: 'fe_deficiency',
          observed: 'fe_deficiency',
        }),
        plant({ position: 4, status: 'needs_check', observed: 'needs_check' }),
        plant({ position: 5, status: 'no_plant', observed: 'no_plant' })
      )
    ).plants.map((item) => item.status)
    expect(statuses).toEqual(['ok', 'n', 'fe', 'check', 'none'])
  })

  it('leaves out a plant the stabiliser has no status for yet', () => {
    const { plants } = toLiveAnalysis(
      analysis(plant({ status: null }), plant({ position: 2 }))
    )
    expect(plants.map((item) => item.position)).toEqual([2])
  })

  it('writes the rule path of the tree down to the class', () => {
    expect(toLiveAnalysis(analysis(plant())).plants[0]?.rule).toBe(
      'Mean_R ≤ 144,55 → Mean_R > 95,75 → Normal'
    )
  })

  it('says why a plant has no rule path', () => {
    const rules = toLiveAnalysis(
      analysis(
        plant({ status: 'no_plant', observed: 'no_plant', rule_path: [] }),
        plant({
          status: 'needs_check',
          observed: 'needs_check',
          rule_path: [],
        }),
        plant({
          status: 'needs_check',
          observed: 'needs_check',
          rule_path: [],
          comparators: [{ model_id: 'svm', label: 'n_deficiency' }],
        })
      )
    ).plants.map((item) => item.rule)
    expect(rules).toEqual([
      'Tidak ada daun hijau di kotak ini.',
      'Luas daun di luar batas yang dikenali model.',
      'Keyakinan rendah, model pembanding berbeda.',
    ])
  })

  it('does not show the rule of another status while the stabiliser settles', () => {
    const { plants } = toLiveAnalysis(
      analysis(plant({ status: 'normal', observed: 'n_deficiency' }))
    )
    expect(plants[0]?.rule).toBe('Status sedang distabilkan.')
  })

  it('counts how often each comparator agrees with the primary model', () => {
    const { comparators } = toLiveAnalysis(
      analysis(
        plant({
          position: 1,
          comparators: [
            { model_id: 'svm', label: 'normal' },
            { model_id: 'naive_bayes', label: 'normal' },
          ],
        }),
        plant({
          position: 2,
          status: 'needs_check',
          observed: 'needs_check',
          predicted: 'normal',
          comparators: [
            { model_id: 'svm', label: 'n_deficiency' },
            { model_id: 'naive_bayes', label: 'normal' },
          ],
        }),
        plant({
          position: 3,
          status: 'no_plant',
          observed: 'no_plant',
          predicted: null,
        })
      )
    )
    expect(comparators).toEqual([
      { modelId: 'svm', agree: 1, total: 2 },
      { modelId: 'naive_bayes', agree: 2, total: 2 },
    ])
  })

  it('has no comparators when the check is off', () => {
    expect(toLiveAnalysis(analysis(plant())).comparators).toEqual([])
  })
})
