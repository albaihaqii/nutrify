import { describe, expect, it } from 'vitest'
import { featureName, ruleStepLabel } from './rule-path'

describe('featureName', () => {
  it('writes a feature like the tree diagram', () => {
    expect(featureName('mean_r')).toBe('Mean_R')
    expect(featureName('lab_b')).toBe('Lab_B')
  })
})

describe('ruleStepLabel', () => {
  it('shows the operator as a sign and the threshold with two decimals', () => {
    expect(
      ruleStepLabel({ feature: 'mean_r', operator: '<=', threshold: 144.55 })
    ).toBe('Mean_R ≤ 144,55')
    expect(
      ruleStepLabel({ feature: 'mean_r', operator: '>', threshold: 95.75 })
    ).toBe('Mean_R > 95,75')
  })
})
