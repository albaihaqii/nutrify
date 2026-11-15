import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { REFRESH_INTERVAL_MS } from '@/config/realtime'
import { toast } from 'sonner'
import { mockRequest } from '@/lib/mock-request'
import {
  DATASET_CSV_HEADER,
  buildDatasetCsv,
  buildDatasetSummary,
  buildSnapshotPage,
  emptySnapshotPage,
  emptySummary,
  setSnapshotLabel,
  type DatasetSummary,
  type LabelClass,
  type Snapshot,
  type SnapshotFilters,
  type SnapshotPage,
} from '../data/dataset'
import { datasetErrorMessage } from '../lib/errors'

// Dummy data for now. Wiring the backend means replacing the dummy call inside
// each function below (docs/API.md, sections 7 and 8), nothing else:
//   summary  -> GET /dataset/summary
//   list     -> GET /observations?labeled=&plant=&class=&has_image=true&page=
//   label    -> PATCH /observations/{id}/label  { label_class }
//   export   -> GET /dataset/export (already CSV text)

export function useDatasetSummary() {
  return useQuery({
    queryKey: ['dataset', 'summary'],
    queryFn: () =>
      mockRequest<DatasetSummary>(buildDatasetSummary(), emptySummary),
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
    queryFn: () =>
      mockRequest<SnapshotPage>(buildSnapshotPage(filters), emptySnapshotPage),
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
    }) => {
      setSnapshotLabel(snapshot.id, label)
      return Promise.resolve()
    },
    // Returning the promise keeps the buttons disabled until the list is reloaded.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dataset'] }),
    onError: (error) => toast.error(datasetErrorMessage(error)),
  })
}

/** The CSV text, ready to download. */
export function fetchDatasetCsv(): Promise<string> {
  return mockRequest<string>(buildDatasetCsv(), `${DATASET_CSV_HEADER}\n`)
}
