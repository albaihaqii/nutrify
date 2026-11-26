import { id } from '@/locales/id'
import { formatNumber } from '@/lib/format'
import {
  type AnalysisResponse,
  type ComparatorResult,
  type LiveAnalysis,
  type LivePlant,
  type LiveStatus,
} from '../data/live-analysis'

const STATUS_OF: Record<string, LiveStatus> = {
  normal: 'ok',
  n_deficiency: 'n',
  fe_deficiency: 'fe',
  needs_check: 'check',
  no_plant: 'none',
}

type ApiPlant = AnalysisResponse['plants'][number]

/** `mean_r` as the tree diagram names it: `Mean_R`. */
function featureName(name: string): string {
  const [first = '', ...rest] = name.split('_')
  const head = first.charAt(0).toUpperCase() + first.slice(1)
  return [head, ...rest.map((part) => part.toUpperCase())].join('_')
}

function ruleOf(plant: ApiPlant, status: LiveStatus): string {
  if (status === 'none') return id.live.rule.noPlant
  if (status === 'check') {
    return plant.comparators.length > 0
      ? id.live.rule.disagree
      : id.live.rule.leafArea
  }
  // The path belongs to the latest analysis; while the stabiliser still
  // settles on another status it would explain the wrong one.
  if (STATUS_OF[plant.observed] !== status) return id.live.rule.settling

  const steps = plant.rule_path.map(
    ({ feature, operator, threshold }) =>
      `${featureName(feature)} ${operator === '<=' ? '≤' : operator} ${formatNumber(threshold, 2)}`
  )
  return [...steps, id.plantStatus[status]].join(' → ')
}

function toPlant(plant: ApiPlant): LivePlant | null {
  const status = plant.status === null ? undefined : STATUS_OF[plant.status]
  if (status === undefined) return null // the stabiliser has no status yet
  return {
    position: plant.position,
    status,
    confidence: plant.confidence,
    rule: ruleOf(plant, status),
  }
}

/** How many plants each comparator labels like the primary model does. */
function comparatorsOf(plants: ApiPlant[]): ComparatorResult[] {
  const counts = new Map<string, { agree: number; total: number }>()
  for (const plant of plants) {
    for (const vote of plant.comparators) {
      const count = counts.get(vote.model_id) ?? { agree: 0, total: 0 }
      count.total += 1
      if (vote.label === plant.predicted) count.agree += 1
      counts.set(vote.model_id, count)
    }
  }
  return [...counts].map(([modelId, count]) => ({ modelId, ...count }))
}

export function toLiveAnalysis(response: AnalysisResponse): LiveAnalysis {
  return {
    analyzedAt:
      response.analyzed_at === null ? null : new Date(response.analyzed_at),
    plants: response.plants
      .map(toPlant)
      .filter((plant): plant is LivePlant => plant !== null),
    comparators: comparatorsOf(response.plants),
  }
}
