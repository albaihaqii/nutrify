import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { REFRESH_INTERVAL_MS } from '@/config/realtime'
import { id } from '@/locales/id'
import { toast } from 'sonner'
import {
  ADVICE_PAGE_SIZE,
  type AdviceFilters,
  type RuleCode,
} from '../data/advice'
import { advisorErrorMessage } from '../lib/errors'
import {
  fetchAdvicePage,
  fetchLatestAdvice,
  fetchRules,
  saveRule,
} from './advice-api'

export function useAdvicePage(
  filters: AdviceFilters,
  pageSize: number = ADVICE_PAGE_SIZE
) {
  return useQuery({
    queryKey: ['advice', 'history', filters, pageSize],
    queryFn: () => fetchAdvicePage(filters, pageSize),
    placeholderData: keepPreviousData,
    refetchInterval: REFRESH_INTERVAL_MS,
  })
}

/** The newest advice whatever the filters are: tells whether the LLM answered last. */
export function useLatestAdvice() {
  return useQuery({
    queryKey: ['advice', 'latest'],
    queryFn: fetchLatestAdvice,
    refetchInterval: REFRESH_INTERVAL_MS,
  })
}

export function useFallbackRules() {
  return useQuery({
    queryKey: ['advice', 'rules'],
    queryFn: fetchRules,
  })
}

export function useUpdateRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ code, actions }: { code: RuleCode; actions: string[] }) =>
      saveRule(code, actions),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['advice', 'rules'] })
      toast.success(id.advisor.toast.ruleSaved)
    },
    onError: (error) => toast.error(advisorErrorMessage(error)),
  })
}
