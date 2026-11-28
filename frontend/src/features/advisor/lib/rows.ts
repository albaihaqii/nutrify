import {
  type AdviceItem,
  type AdvicePage,
  type AdvicePageResponse,
  type AdviceResponse,
  type FallbackRule,
  type RuleResponse,
} from '../data/advice'

export function toAdviceItem(item: AdviceResponse): AdviceItem {
  return {
    id: item.id,
    createdAt: item.created_at,
    plantPosition: item.plant_position,
    severity: item.severity,
    summary: item.summary,
    likelyCauses: item.likely_causes,
    suggestedActions: item.suggested_actions,
    source: item.source,
    modelName: item.model_name,
  }
}

export function toAdvicePage(response: AdvicePageResponse): AdvicePage {
  return {
    rows: response.items.map(toAdviceItem),
    total: response.total,
    page: response.page,
    pageSize: response.page_size,
  }
}

export function toRule(rule: RuleResponse): FallbackRule {
  return { code: rule.code, suggestedActions: rule.suggested_actions }
}
