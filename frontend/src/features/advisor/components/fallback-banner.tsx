import { id } from '@/locales/id'
import { TriangleAlert } from 'lucide-react'
import { useLatestAdvice } from '../api/advice-queries'

/**
 * Shown while the newest advice came from the fallback rules, which only
 * happens when the LLM could not answer. It disappears by itself as soon as
 * an LLM advice is stored again.
 */
export function FallbackBanner() {
  const query = useLatestAdvice()

  if (query.data?.source !== 'rules') return null

  return (
    <div
      role='status'
      className='flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100'
    >
      <TriangleAlert aria-hidden='true' className='mt-0.5 size-4 shrink-0' />
      <p>
        <strong className='font-semibold'>
          {id.advisor.fallbackBanner.title}
        </strong>{' '}
        {id.advisor.fallbackBanner.text}
      </p>
    </div>
  )
}
