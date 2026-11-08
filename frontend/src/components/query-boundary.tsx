import { type ReactNode } from 'react'
import { type UseQueryResult } from '@tanstack/react-query'
import { ErrorAlert } from '@/components/error-alert'

type QueryBoundaryProps<T> = {
  query: UseQueryResult<T>
  skeleton: ReactNode
  empty?: { when: (data: T) => boolean; view: ReactNode }
  children: (data: T) => ReactNode
}

export function QueryBoundary<T>({
  query,
  skeleton,
  empty,
  children,
}: QueryBoundaryProps<T>) {
  if (query.isPending) return <>{skeleton}</>

  // A failed background refresh keeps the last good data on screen.
  if (query.data === undefined) {
    return <ErrorAlert onRetry={() => void query.refetch()} />
  }

  if (empty?.when(query.data)) return <>{empty.view}</>

  return <>{children(query.data)}</>
}
