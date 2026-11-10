import { type PlantStatus } from '@/lib/plant-status'

export interface PlantSummary {
  id: string
  status: PlantStatus
  /** 0 to 1, or null when the model has no confident answer. */
  confidence: number | null
  /** ISO timestamp of the last analysis of this plant. */
  updatedAt: string
}

export interface StatusEntry {
  /** ISO timestamp. */
  at: string
  status: PlantStatus
  confidence: number | null
}

export interface MeanRgb {
  r: number
  g: number
  b: number
}

export interface PlantDetail extends PlantSummary {
  /** Average leaf color from segmentation, null when not available. */
  mean: MeanRgb | null
  /** Decision path of the C4.5 tree, one condition per item. */
  path: string[]
  /** Newest first. */
  history: StatusEntry[]
}

interface Seed {
  id: string
  mean: MeanRgb | null
  path: string[]
  /** Newest first, one entry per hour. */
  history: Array<[PlantStatus, number | null]>
}

const normalPath = ['Mean_G > 118', 'EC > 1,5', '→ Normal']

const seeds: Seed[] = [
  {
    id: 'L1',
    mean: { r: 62, g: 158, b: 72 },
    path: normalPath,
    history: [
      ['ok', 0.94],
      ['ok', 0.93],
      ['ok', 0.92],
      ['ok', 0.94],
      ['ok', 0.95],
    ],
  },
  {
    id: 'L2',
    mean: { r: 66, g: 152, b: 70 },
    path: normalPath,
    history: [
      ['ok', 0.91],
      ['ok', 0.9],
      ['ok', 0.92],
      ['ok', 0.91],
      ['ok', 0.9],
    ],
  },
  {
    id: 'L3',
    mean: { r: 126, g: 108, b: 58 },
    path: ['Mean_G ≤ 112', 'Mean_R > 96', '→ Defisiensi N'],
    history: [
      ['n', 0.88],
      ['n', 0.85],
      ['ok', 0.71],
      ['ok', 0.9],
      ['ok', 0.93],
    ],
  },
  {
    id: 'L4',
    mean: { r: 64, g: 155, b: 68 },
    path: normalPath,
    history: [
      ['ok', 0.9],
      ['ok', 0.91],
      ['ok', 0.9],
      ['ok', 0.89],
      ['ok', 0.92],
    ],
  },
  {
    id: 'L5',
    mean: { r: 118, g: 110, b: 78 },
    path: ['Mean_G ≤ 112', 'Mean_B > 70', '→ Defisiensi Fe'],
    history: [
      ['fe', 0.82],
      ['fe', 0.8],
      ['ok', 0.74],
      ['ok', 0.88],
      ['ok', 0.9],
    ],
  },
  {
    id: 'L6',
    mean: { r: 112, g: 122, b: 92 },
    path: [
      'Keyakinan di bawah ambang',
      'Model pembanding berbeda',
      '→ Perlu Dicek',
    ],
    history: [
      ['check', null],
      ['ok', 0.62],
      ['ok', 0.8],
      ['ok', 0.85],
      ['ok', 0.9],
    ],
  },
]

const minutesAgo = (now: number, minutes: number) =>
  new Date(now - minutes * 60_000).toISOString()

/** Built on every call so the timestamps stay relative to "now". */
export function buildPlantDetails(now: number = Date.now()): PlantDetail[] {
  return seeds.map((seed) => {
    const history = seed.history.map(([status, confidence], index) => ({
      at: minutesAgo(now, 3 + index * 60),
      status,
      confidence,
    }))
    const [latest] = history
    return {
      id: seed.id,
      status: latest.status,
      confidence: latest.confidence,
      updatedAt: latest.at,
      mean: seed.mean,
      path: seed.path,
      history,
    }
  })
}

export function buildPlantSummaries(now: number = Date.now()): PlantSummary[] {
  return buildPlantDetails(now).map(
    ({ id, status, confidence, updatedAt }) => ({
      id,
      status,
      confidence,
      updatedAt,
    })
  )
}
