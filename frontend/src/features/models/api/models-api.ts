import { AxiosError } from 'axios'
import { api } from '@/lib/api'
import { type LabelClass } from '@/features/dataset/data/dataset'
import {
  emptyReport,
  emptyTree,
  type ComparatorId,
  type FeatureKey,
  type ModelId,
  type ModelMetrics,
  type ModelReport,
  type ModelRole,
  type ModelTree,
  type PredictionResult,
  type TreeNode,
} from '../data/models'

// Shapes returned by the backend (docs/API.md, section 10).
interface ReportDto {
  trained_at: string
  test_size: number
  models: Array<{ id: ModelId; role: ModelRole; metrics: ModelMetrics }>
  confusion: number[][] | null
}

type TreeNodeDto =
  | { class: LabelClass; samples: number; confidence: number }
  | {
      feature: FeatureKey
      threshold: number
      left: TreeNodeDto
      right: TreeNodeDto
    }

interface TreeDto {
  root: TreeNodeDto
}

interface PredictionDto {
  class: LabelClass
  confidence: number
  features: Partial<Record<FeatureKey, number>>
  mask_area_ratio: number
  comparators: Array<{ model_id: ComparatorId; class: LabelClass }>
}

// The API sorts the keys of an object, so the colour features are put back in their natural order.
const FEATURE_ORDER: readonly FeatureKey[] = [
  'mean_r',
  'mean_g',
  'mean_b',
  'lab_l',
  'lab_a',
  'lab_b',
]

export function toReport(dto: ReportDto): ModelReport {
  return {
    trainedAt: dto.trained_at,
    testSize: dto.test_size,
    models: dto.models.map(({ id, role, metrics }) => ({ id, role, metrics })),
    confusion: dto.confusion,
  }
}

function toNode(dto: TreeNodeDto): TreeNode {
  if ('class' in dto) {
    return {
      kind: 'leaf',
      label: dto.class,
      samples: dto.samples,
      confidence: dto.confidence,
    }
  }
  return {
    kind: 'split',
    feature: dto.feature,
    threshold: dto.threshold,
    left: toNode(dto.left),
    right: toNode(dto.right),
  }
}

export function toTree(dto: TreeDto): ModelTree {
  return { root: toNode(dto.root) }
}

export function toPrediction(dto: PredictionDto): PredictionResult {
  return {
    label: dto.class,
    confidence: dto.confidence,
    features: FEATURE_ORDER.flatMap((key) => {
      const value = dto.features[key]
      return value === undefined ? [] : [{ key, value }]
    }),
    leafArea: dto.mask_area_ratio,
    comparators: dto.comparators.map((item) => ({
      modelId: item.model_id,
      label: item.class,
    })),
  }
}

/** Before the first training the API answers 404, which the page shows as an empty state. */
async function getOr404<T, R>(
  path: string,
  convert: (dto: T) => R,
  whenMissing: R
): Promise<R> {
  try {
    const { data } = await api.get<T>(path)
    return convert(data)
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status === 404) {
      return whenMissing
    }
    throw error
  }
}

export function fetchReport(): Promise<ModelReport> {
  return getOr404<ReportDto, ModelReport>('/models', toReport, emptyReport)
}

export function fetchTree(): Promise<ModelTree> {
  return getOr404<TreeDto, ModelTree>('/models/c45/tree', toTree, emptyTree)
}

/** A what-if: the photo is not stored. */
export async function predictImage(file: File): Promise<PredictionResult> {
  const form = new FormData()
  form.append('image', file)
  const { data } = await api.post<PredictionDto>('/models/predict', form)
  return toPrediction(data)
}
