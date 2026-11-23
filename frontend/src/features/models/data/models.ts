import { type LabelClass } from '@/features/dataset/data/dataset'

export type ComparatorId = 'svm' | 'naive_bayes' | 'random_forest'

/** One of them is the primary model (`role`); the registry decides which. */
export type ModelId = 'c45' | ComparatorId
export type ModelRole = 'primary' | 'comparator'

export const metricKeys = ['accuracy', 'precision', 'recall', 'f1'] as const
export type MetricKey = (typeof metricKeys)[number]

/** Each value from 0 to 1. Precision, recall and F1 are macro averages over the 3 classes. */
export type ModelMetrics = Record<MetricKey, number>

interface ModelResult {
  id: ModelId
  role: ModelRole
  metrics: ModelMetrics
}

export interface ModelReport {
  /** ISO timestamp, as written by the notebook. */
  trainedAt: string
  /** Rows in the test set the metrics were computed on. */
  testSize: number
  /** The primary model comes first. */
  models: ModelResult[]
  /**
   * Of the primary model. Rows are the actual class, columns the predicted class, both in
   * `labelClasses` order. null when the notebook results are missing.
   */
  confusion: number[][] | null
}

export const emptyReport: ModelReport = {
  trainedAt: '',
  testSize: 0,
  models: [],
  confusion: null,
}

/** The colour features of version 1, as the API names them. */
export type FeatureKey =
  | 'mean_r'
  | 'mean_g'
  | 'mean_b'
  | 'lab_l'
  | 'lab_a'
  | 'lab_b'

/**
 * Below this confidence the result is shown as "Perlu Dicek" instead of a class.
 * Use the same threshold as the live worker.
 */
export const LOW_CONFIDENCE_THRESHOLD = 0.6

/** The largest photo the API accepts (backend MAX_CONTENT_LENGTH). */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024

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
  /** Of the primary model. */
  label: LabelClass
  confidence: number
  /** The colour the model saw: mean of the leaf pixels. */
  features: Array<{ key: FeatureKey; value: number }>
  /** Share (0 to 1) of the photo the segmentation marked as leaf. */
  leafArea: number
  comparators: Array<{ modelId: ComparatorId; label: LabelClass }>
}
