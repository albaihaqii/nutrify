import { describe, expect, it } from 'vitest'
import { toPrediction, toReport, toTree } from './models-api'

describe('toReport', () => {
  it('keeps the role of each model and drops the API-only fields', () => {
    const report = toReport({
      trained_at: '2026-11-21T18:42:41',
      test_size: 76,
      models: [
        {
          id: 'svm',
          role: 'primary',
          metrics: { accuracy: 0.84, precision: 0.86, recall: 0.84, f1: 0.84 },
        },
        {
          id: 'c45',
          role: 'comparator',
          metrics: { accuracy: 0.72, precision: 0.83, recall: 0.68, f1: 0.7 },
        },
      ],
      confusion: [[1, 0, 0]],
    })

    expect(report.trainedAt).toBe('2026-11-21T18:42:41')
    expect(report.testSize).toBe(76)
    expect(report.models.map((model) => [model.id, model.role])).toEqual([
      ['svm', 'primary'],
      ['c45', 'comparator'],
    ])
    expect(report.confusion).toEqual([[1, 0, 0]])
  })
})

describe('toTree', () => {
  it('turns nested API nodes into splits and leaves', () => {
    const tree = toTree({
      root: {
        feature: 'mean_r',
        threshold: 95.75,
        left: { class: 'normal', samples: 65, confidence: 0.72 },
        right: {
          feature: 'mean_b',
          threshold: 76.15,
          left: { class: 'n_deficiency', samples: 19, confidence: 0.84 },
          right: { class: 'fe_deficiency', samples: 25, confidence: 0.84 },
        },
      },
    })

    expect(tree.root).toEqual({
      kind: 'split',
      feature: 'mean_r',
      threshold: 95.75,
      left: { kind: 'leaf', label: 'normal', samples: 65, confidence: 0.72 },
      right: {
        kind: 'split',
        feature: 'mean_b',
        threshold: 76.15,
        left: {
          kind: 'leaf',
          label: 'n_deficiency',
          samples: 19,
          confidence: 0.84,
        },
        right: {
          kind: 'leaf',
          label: 'fe_deficiency',
          samples: 25,
          confidence: 0.84,
        },
      },
    })
  })
})

describe('toPrediction', () => {
  it('renames the API fields and puts the measured colour in its natural order', () => {
    expect(
      toPrediction({
        class: 'n_deficiency',
        confidence: 0.84,
        features: { mean_b: 50.9, mean_g: 160.3, mean_r: 170.3 },
        mask_area_ratio: 0.23,
        comparators: [
          { model_id: 'svm', class: 'n_deficiency' },
          { model_id: 'random_forest', class: 'normal' },
        ],
      })
    ).toEqual({
      label: 'n_deficiency',
      confidence: 0.84,
      features: [
        { key: 'mean_r', value: 170.3 },
        { key: 'mean_g', value: 160.3 },
        { key: 'mean_b', value: 50.9 },
      ],
      leafArea: 0.23,
      comparators: [
        { modelId: 'svm', label: 'n_deficiency' },
        { modelId: 'random_forest', label: 'normal' },
      ],
    })
  })
})
