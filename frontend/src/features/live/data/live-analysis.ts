import { type PlantStatus } from '@/lib/plant-status'

export interface LivePlant {
  id: string
  status: PlantStatus
  /** 0 to 1, or null when the model has no confident answer. */
  confidence: number | null
  /** Decision path of the C4.5 tree for this plant. */
  rule: string
}

export interface ComparatorResult {
  name: string
  agree: number
  total: number
}

export interface LiveAnalysis {
  analyzedSecondsAgo: number
  plants: LivePlant[]
  comparators: ComparatorResult[]
}

export const emptyAnalysis: LiveAnalysis = {
  analyzedSecondsAgo: 0,
  plants: [],
  comparators: [],
}

export const liveAnalysis: LiveAnalysis = {
  analyzedSecondsAgo: 8,
  plants: [
    {
      id: 'L1',
      status: 'ok',
      confidence: 0.94,
      rule: 'Mean_G > 118 → EC > 1,5 → Normal',
    },
    {
      id: 'L2',
      status: 'ok',
      confidence: 0.91,
      rule: 'Mean_G > 118 → EC > 1,5 → Normal',
    },
    {
      id: 'L3',
      status: 'n',
      confidence: 0.88,
      rule: 'Mean_G ≤ 112 → Mean_R > 96 → Defisiensi N',
    },
    {
      id: 'L4',
      status: 'ok',
      confidence: 0.9,
      rule: 'Mean_G > 118 → EC > 1,5 → Normal',
    },
    {
      id: 'L5',
      status: 'fe',
      confidence: 0.82,
      rule: 'Mean_G ≤ 112 → Mean_B > 70 → Defisiensi Fe',
    },
    {
      id: 'L6',
      status: 'check',
      confidence: null,
      rule: 'Keyakinan rendah, model pembanding berbeda',
    },
  ],
  comparators: [
    { name: 'SVM', agree: 5, total: 6 },
    { name: 'Naive Bayes', agree: 4, total: 6 },
    { name: 'Random Forest', agree: 5, total: 6 },
  ],
}
