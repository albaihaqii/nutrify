import { formatNumber } from '@/lib/format'

/** One condition of the C4.5 tree as the API sends it. */
export interface RuleStep {
  feature: string
  operator: string
  threshold: number
}

/** `mean_r` as the tree diagram names it: `Mean_R`. */
export function featureName(name: string): string {
  const [first = '', ...rest] = name.split('_')
  const head = first.charAt(0).toUpperCase() + first.slice(1)
  return [head, ...rest.map((part) => part.toUpperCase())].join('_')
}

/** "Mean_R ≤ 144,55" */
export function ruleStepLabel({ feature, operator, threshold }: RuleStep) {
  const sign = operator === '<=' ? '≤' : operator
  return `${featureName(feature)} ${sign} ${formatNumber(threshold, 2)}`
}
