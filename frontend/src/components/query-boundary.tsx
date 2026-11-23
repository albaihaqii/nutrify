import { type ReactNode } from 'react'
import { ErrorAlert } from '@/components/error-alert'

/** What the boundary needs; a query result or a combination of several fits. */
export type BoundaryQuery<T> = {
  isPending: boolean
  data: T | undefined
  refetch: () => unknown
}

type QueryBoundaryProps<T> = {
  query: BoundaryQuery<T>
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
