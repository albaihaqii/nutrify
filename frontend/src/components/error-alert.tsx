import { id } from '@/locales/id'
import { TriangleAlert } from 'lucide-react'

type ErrorAlertProps = { onRetry?: () => void }

export function ErrorAlert({ onRetry }: ErrorAlertProps) {
  return (
    <div
      role='alert'
      className='flex items-start gap-2 rounded-md bg-status-high-bg p-3 text-status-high-fg'
    >
      <TriangleAlert aria-hidden='true' className='mt-0.5 size-4 shrink-0' />
      <div>
        <strong className='font-semibold'>{id.state.error}</strong>{' '}
        {onRetry && (
          <button
            type='button'
            onClick={onRetry}
            className='underline underline-offset-2'
          >
            {id.state.retry}
          </button>
        )}
      </div>
    </div>
  )
}
