import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { REFRESH_INTERVAL_MS } from '@/config/realtime'
import { toast } from 'sonner'
import {
  type LabelClass,
  type Snapshot,
  type SnapshotFilters,
} from '../data/dataset'
import { datasetErrorMessage } from '../lib/errors'
import {
  captureSnapshot,
  fetchDatasetSummary,
  fetchSnapshotPage,
  saveLabel,
} from './dataset-api'

export function useDatasetSummary() {
  return useQuery({
    queryKey: ['dataset', 'summary'],
    queryFn: fetchDatasetSummary,
    refetchInterval: REFRESH_INTERVAL_MS,
  })
}

/**
 * A work queue, not a live view: no polling and no refetch on focus, so cards
 * never move while someone is labelling. It reloads after each label.
 */
export function useSnapshots(filters: SnapshotFilters) {
  return useQuery({
    queryKey: ['dataset', 'snapshots', filters],
    queryFn: () => fetchSnapshotPage(filters),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  })
}

/** Setting `label` to null clears it. */
export function useLabelSnapshot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      snapshot,
      label,
    }: {
      snapshot: Snapshot
      label: LabelClass | null
    }) => saveLabel(snapshot.id, label),
    // Returning the promise keeps the buttons disabled until the list is reloaded.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dataset'] }),
    onError: (error) => toast.error(datasetErrorMessage(error)),
  })
}

/** The Snapshot button of the live page: the new results join the queue to label. */
export function useCaptureSnapshot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: captureSnapshot,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dataset'] }),
    onError: (error) => toast.error(datasetErrorMessage(error)),
  })
}
