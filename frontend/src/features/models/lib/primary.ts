import { type ModelId, type ModelReport } from '../data/models'

/** The primary model of a report, or null before the first training. */
export function primaryModelId(
  report: ModelReport | undefined
): ModelId | null {
  return report?.models.find((model) => model.role === 'primary')?.id ?? null
}
