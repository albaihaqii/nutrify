import { id } from '@/locales/id'
import { toast } from 'sonner'
import { getApiErrorCode, isNetworkError } from '@/lib/api'

/** Maps any failed request to an Indonesian message (docs/API.md, section 1.3). */
function serverErrorMessage(error: unknown): string {
  if (
    error &&
    typeof error === 'object' &&
    'status' in error &&
    Number(error.status) === 204
  ) {
    return id.errors.noContent
  }

  if (isNetworkError(error)) return id.errors.network

  switch (getApiErrorCode(error)) {
    case 'forbidden':
      return id.errors.forbidden
    case 'not_found':
      return id.errors.notFound
    case 'conflict':
      return id.errors.conflict
    case 'validation_error':
    case 'bad_request':
      return id.errors.validation
    case 'rate_limited':
      return id.errors.rateLimited
    case 'internal_error':
      return id.errors.server
    case 'service_unavailable':
      return id.errors.unavailable
    default:
      return id.errors.unknown
  }
}

/** App-wide fallback toast for mutations that do not handle their own errors. */
export function handleServerError(error: unknown) {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log(error)
  }

  toast.error(serverErrorMessage(error))
}
