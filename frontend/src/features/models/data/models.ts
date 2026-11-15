import { labelClasses, type LabelClass } from '@/features/dataset/data/dataset'

const comparatorIds = ['svm', 'naive_bayes', 'random_forest'] as const
type ComparatorId = (typeof comparatorIds)[number]

/** C4.5 is the primary model; the rest only serve as comparison. */
type ModelId = 'c45' | ComparatorId

export const metricKeys = ['accuracy', 'precision', 'recall', 'f1'] as const
export type MetricKey = (typeof metricKeys)[number]

/** Each value from 0 to 1. Precision, recall and F1 are macro averages over the 3 classes. */
type ModelMetrics = Record<MetricKey, number>

interface ModelResult {
  id: ModelId
  metrics: ModelMetrics
}

export interface ModelReport {
  /** ISO timestamp. */
  trainedAt: string
  /** Rows in the test set the metrics were computed on. */
  testSize: number
  models: ModelResult[]
  /** Rows are the actual class, columns the predicted class, both in `labelClasses` order. */
  confusion: number[][]
}

export const emptyReport: ModelReport = {
  trainedAt: '',
  testSize: 0,
  models: [],
  confusion: [],
}

/**
 * The model's input columns, in the order the model was trained on.
 * Keep in sync with the dataset export and the live worker.
 */
export const featureKeys = [
  'mean_r',
  'mean_g',
  'mean_b',
  'ph',
  'ec',
  'temperature',
] as const
export type FeatureKey = (typeof featureKeys)[number]
export type FeatureValues = Record<FeatureKey, number>

/** What a plausible reading looks like; anything outside is almost certainly a typo. */
export const featureRange: Record<FeatureKey, { min: number; max: number }> = {
  mean_r: { min: 0, max: 255 },
  mean_g: { min: 0, max: 255 },
  mean_b: { min: 0, max: 255 },
  ph: { min: 0, max: 14 },
  ec: { min: 0, max: 10 },
  temperature: { min: 0, max: 50 },
}

/** The values the form starts with. */
export const exampleInput: FeatureValues = {
  mean_r: 148,
  mean_g: 152,
  mean_b: 64,
  ph: 6.1,
  ec: 1.72,
  temperature: 24.6,
}

/**
 * Below this confidence the result is shown as "Perlu Dicek" instead of a class.
 * Dummy value: use the same threshold as the live worker.
 */
export const LOW_CONFIDENCE_THRESHOLD = 0.6

export interface TreeLeaf {
  kind: 'leaf'
  label: LabelClass
  /** Training rows that ended up in this leaf. */
  samples: number
  /** Share (0 to 1) of those rows that belong to `label`. */
  confidence: number
}

export interface TreeSplit {
  kind: 'split'
  feature: FeatureKey
  threshold: number
  /** Value is less than or equal to the threshold. */
  left: TreeNode
  /** Value is greater than the threshold. */
  right: TreeNode
}

export type TreeNode = TreeLeaf | TreeSplit

export interface ModelTree {
  /** null when no model has been trained yet. */
  root: TreeNode | null
}

export const emptyTree: ModelTree = { root: null }

export interface PredictionResult {
  /** C4.5. */
  label: LabelClass
  confidence: number
  comparators: Array<{ modelId: ComparatorId; label: LabelClass }>
}

// ---- Dummy data. The real API returns the trained models' results. ----

const DAY_MS = 24 * 60 * 60 * 1000

/** Rows are the actual class, columns the predicted class. */
const C45_CONFUSION = [
  [41, 2, 1],
  [3, 27, 2],
  [1, 2, 24],
]

/** Deliberately not "C4.5 wins": these numbers only exist to fill the page. */
const COMPARATOR_METRICS: Record<ComparatorId, ModelMetrics> = {
  svm: { accuracy: 0.87, precision: 0.86, recall: 0.85, f1: 0.85 },
  naive_bayes: { accuracy: 0.81, precision: 0.8, recall: 0.79, f1: 0.79 },
  random_forest: { accuracy: 0.91, precision: 0.9, recall: 0.9, f1: 0.9 },
}

function metricsFromConfusion(matrix: number[][]): ModelMetrics {
  const count = (row: number, column: number) => matrix[row]?.[column] ?? 0
  const size = matrix.length
  let total = 0
  let correct = 0
  let precision = 0
  let recall = 0
  let f1 = 0

  for (let index = 0; index < size; index++) {
    const hits = count(index, index)
    let actual = 0
    let predicted = 0
    for (let other = 0; other < size; other++) {
      actual += count(index, other)
      predicted += count(other, index)
    }
    const classPrecision = predicted === 0 ? 0 : hits / predicted
    const classRecall = actual === 0 ? 0 : hits / actual
    total += actual
    correct += hits
    precision += classPrecision
    recall += classRecall
    f1 +=
      classPrecision + classRecall === 0
        ? 0
        : (2 * classPrecision * classRecall) / (classPrecision + classRecall)
  }

  return {
    accuracy: total === 0 ? 0 : correct / total,
    precision: precision / size,
    recall: recall / size,
    f1: f1 / size,
  }
}

export function buildModelReport(now: number = Date.now()): ModelReport {
  const testSize = C45_CONFUSION.flat().reduce((sum, value) => sum + value, 0)

  return {
    trainedAt: new Date(now - 3 * DAY_MS).toISOString(),
    testSize,
    models: [
      { id: 'c45', metrics: metricsFromConfusion(C45_CONFUSION) },
      ...comparatorIds.map((id) => ({ id, metrics: COMPARATOR_METRICS[id] })),
    ],
    confusion: C45_CONFUSION,
  }
}

const leaf = (
  label: LabelClass,
  samples: number,
  confidence: number
): TreeLeaf => ({ kind: 'leaf', label, samples, confidence })

const split = (
  feature: FeatureKey,
  threshold: number,
  left: TreeNode,
  right: TreeNode
): TreeSplit => ({ kind: 'split', feature, threshold, left, right })

const DUMMY_TREE: TreeNode = split(
  'mean_r',
  103,
  split('ec', 1.35, leaf('n_deficiency', 18, 0.78), leaf('normal', 121, 0.97)),
  split(
    'mean_b',
    85,
    leaf('n_deficiency', 47, 0.88),
    split('ph', 6.4, leaf('fe_deficiency', 26, 0.9), leaf('normal', 6, 0.55))
  )
)

export function buildModelTree(): ModelTree {
  return { root: DUMMY_TREE }
}

function classify(node: TreeNode, values: FeatureValues): TreeLeaf {
  if (node.kind === 'leaf') return node
  return classify(
    values[node.feature] <= node.threshold ? node.left : node.right,
    values
  )
}

/** Average colour of a leaf per class: just enough for the comparators to differ a little. */
const CENTROIDS: Record<LabelClass, readonly [number, number, number]> = {
  normal: [78, 138, 62],
  n_deficiency: [128, 150, 58],
  fe_deficiency: [140, 170, 112],
}

const COMPARATOR_WEIGHTS: Record<
  ComparatorId,
  readonly [number, number, number]
> = {
  svm: [1, 1, 1],
  naive_bayes: [0.5, 1, 2],
  random_forest: [1, 0.5, 1],
}

function nearestClass(
  values: FeatureValues,
  weights: readonly [number, number, number]
): LabelClass {
  let best: LabelClass = labelClasses[0]
  let bestDistance = Infinity

  for (const label of labelClasses) {
    const centroid = CENTROIDS[label]
    const distance =
      weights[0] * (values.mean_r - centroid[0]) ** 2 +
      weights[1] * (values.mean_g - centroid[1]) ** 2 +
      weights[2] * (values.mean_b - centroid[2]) ** 2
    if (distance < bestDistance) {
      best = label
      bestDistance = distance
    }
  }
  return best
}

export function buildPrediction(values: FeatureValues): PredictionResult {
  const result = classify(DUMMY_TREE, values)

  return {
    label: result.label,
    confidence: result.confidence,
    comparators: comparatorIds.map((modelId) => ({
      modelId,
      label: nearestClass(values, COMPARATOR_WEIGHTS[modelId]),
    })),
  }
}
