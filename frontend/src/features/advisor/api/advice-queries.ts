import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { id } from '@/locales/id'
import { toast } from 'sonner'
import { mockRequest } from '@/lib/mock-request'
import {
  buildAdvicePage,
  buildFallbackRules,
  buildLatestAdvice,
  emptyAdvicePage,
  setRuleActions,
  type AdviceFilters,
  type AdviceItem,
  type AdvicePage,
  type FallbackRule,
  type RuleCode,
} from '../data/advice'
import { advisorErrorMessage } from '../lib/errors'

// Dummy data for now. Wiring the backend means replacing the dummy call inside
// each function below (docs/API.md, section 11), nothing else:
//   history -> GET /advice?source=&plant=&page=
//   latest  -> GET /advice/latest          (404 not_found means none yet: return null)
//   rules   -> GET /advice/rules
//   update  -> PUT /advice/rules/{code}    { suggested_actions }

export function useAdvicePage(filters: AdviceFilters) {
  return useQuery({
    queryKey: ['advice', 'history', filters],
    queryFn: () =>
      mockRequest<AdvicePage>(buildAdvicePage(filters), emptyAdvicePage),
    placeholderData: keepPreviousData,
  })
}

/** The newest advice whatever the filters are: tells whether the LLM answered last. */
export function useLatestAdvice() {
  return useQuery({
    queryKey: ['advice', 'latest'],
    queryFn: () => mockRequest<AdviceItem | null>(buildLatestAdvice(), null),
  })
}

export function useFallbackRules() {
  return useQuery({
    queryKey: ['advice', 'rules'],
    queryFn: () => mockRequest<FallbackRule[]>(buildFallbackRules(), []),
  })
}

export function useUpdateRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ code, actions }: { code: RuleCode; actions: string[] }) => {
      setRuleActions(code, actions)
      return Promise.resolve()
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['advice', 'rules'] })
      toast.success(id.advisor.toast.ruleSaved)
    },
    onError: (error) => toast.error(advisorErrorMessage(error)),
  })
}
