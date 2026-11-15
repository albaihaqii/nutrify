import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { mockRequest } from '@/lib/mock-request'
import {
  buildModelReport,
  buildModelTree,
  buildPrediction,
  emptyReport,
  emptyTree,
  type FeatureValues,
  type ModelReport,
  type ModelTree,
  type PredictionResult,
} from '../data/models'
import { modelsErrorMessage } from '../lib/errors'

// Dummy data for now. Wiring the backend means replacing the dummy call inside
// each function below, nothing else:
//   report  -> GET  /models                { trained_at, test_size, models[], confusion }
//   tree    -> GET  /models/c45/tree       nested split / leaf nodes
//   predict -> POST /models/predict        { features } -> C4.5 + the three comparators

/** Metrics and confusion matrix of every trained model. Empty before the first training. */
export function useModelReport() {
  return useQuery({
    queryKey: ['models', 'report'],
    queryFn: () => mockRequest<ModelReport>(buildModelReport(), emptyReport),
  })
}

/** The C4.5 tree, one source for both the rules and the diagram. */
export function useModelTree() {
  return useQuery({
    queryKey: ['models', 'c45-tree'],
    queryFn: () => mockRequest<ModelTree>(buildModelTree(), emptyTree),
  })
}

/** A what-if: nothing is saved. */
export function usePredict() {
  return useMutation({
    mutationFn: (values: FeatureValues) =>
      mockRequest<PredictionResult>(
        buildPrediction(values),
        buildPrediction(values)
      ),
    onError: (error) => toast.error(modelsErrorMessage(error)),
  })
}
