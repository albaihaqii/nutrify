import { id } from '@/locales/id'
import { StatusBadge } from '@/components/status-badge'
import { type AdviceSource } from '../data/advice'

/** Where an advice came from: the LLM, or the fallback rules. */
export function AdviceSourceBadge({ source }: { source: AdviceSource }) {
  return (
    <StatusBadge tone='check'>
      {source === 'llm'
        ? id.advisor.latest.sourceLlm
        : id.advisor.latest.sourceRules}
    </StatusBadge>
  )
}
