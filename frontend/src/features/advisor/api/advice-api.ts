import { api, getApiErrorCode } from '@/lib/api'
import { plantIds } from '@/lib/plants'
import { rangeStart } from '@/features/history/lib/range'
import {
  ADVICE_PAGE_SIZE,
  type AdviceFilters,
  type AdviceItem,
  type AdvicePage,
  type AdvicePageResponse,
  type AdviceResponse,
  type FallbackRule,
  type RuleCode,
  type RuleResponse,
  type RulesResponse,
} from '../data/advice'
import { toAdviceItem, toAdvicePage, toRule } from '../lib/rows'

export async function fetchAdvicePage(
  filters: AdviceFilters,
  pageSize: number = ADVICE_PAGE_SIZE
): Promise<AdvicePage> {
  const { data } = await api.get<AdvicePageResponse>('/advice', {
    params: {
      source: filters.source === 'all' ? undefined : filters.source,
      plant:
        filters.plant === undefined
          ? undefined
          : plantIds.indexOf(filters.plant) + 1,
      from:
        filters.range === undefined
          ? undefined
          : rangeStart(filters.range).toISOString(),
      page: filters.page,
      page_size: pageSize,
    },
  })
  return toAdvicePage(data)
}

/** The newest advice, or null while there is none (the API answers 404 then). */
export async function fetchLatestAdvice(): Promise<AdviceItem | null> {
  try {
    const { data } = await api.get<AdviceResponse>('/advice/latest')
    return toAdviceItem(data)
  } catch (error) {
    if (getApiErrorCode(error) === 'not_found') return null
    throw error
  }
}

export async function fetchRules(): Promise<FallbackRule[]> {
  const { data } = await api.get<RulesResponse>('/advice/rules')
  return data.items.map(toRule)
}

export async function saveRule(
  code: RuleCode,
  actions: string[]
): Promise<FallbackRule> {
  const { data } = await api.put<RuleResponse>(`/advice/rules/${code}`, {
    suggested_actions: actions,
  })
  return toRule(data)
}
