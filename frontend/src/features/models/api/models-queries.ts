import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { modelsErrorMessage } from '../lib/errors'
import { fetchReport, fetchTree, predictImage } from './models-api'

/** Metrics and confusion matrix of every trained model. Empty before the first training. */
export function useModelReport() {
  return useQuery({ queryKey: ['models', 'report'], queryFn: fetchReport })
}

/** The C4.5 tree, one source for both the rules and the diagram. */
export function useModelTree() {
  return useQuery({ queryKey: ['models', 'c45-tree'], queryFn: fetchTree })
}

/** A what-if on one photo: nothing is saved. */
export function usePredict() {
  return useMutation({
    mutationFn: predictImage,
    onError: (error) => toast.error(modelsErrorMessage(error)),
  })
}
