import { id } from '@/locales/id'
import { formatDayTime } from '@/lib/format-time'
import { SeverityBadge } from '@/components/severity-badge'
import { type AdviceItem } from '../data/advice'
import { targetLabel } from '../lib/target'
import { AdviceSourceBadge } from './source-badge'
import { TextList } from './text-list'

/** One advice read in full: what it is about, the likely causes and the steps. */
export function AdviceBody({ advice }: { advice: AdviceItem }) {
  return (
    <>
      <div className='mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground'>
        <SeverityBadge severity={advice.severity} />
        <AdviceSourceBadge source={advice.source} />
        <span>
          {id.advisor.latest.about
            .replace('{target}', targetLabel(advice.plantPosition))
            .replace('{time}', formatDayTime(advice.createdAt))}
        </span>
      </div>
      <p className='font-semibold'>{advice.summary}</p>
      {advice.likelyCauses.length > 0 && (
        <div className='mt-1.5 text-muted-foreground'>
          <p>{id.advisor.latest.cause}</p>
          <TextList items={advice.likelyCauses} />
        </div>
      )}
      <ol className='mt-2 flex list-decimal flex-col gap-1 ps-[18px]'>
        {advice.suggestedActions.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p className='mt-3 border-t pt-3 text-xs text-muted-foreground'>
        {id.advisor.latest.note}
      </p>
    </>
  )
}
