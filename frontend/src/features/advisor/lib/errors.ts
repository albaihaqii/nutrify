import { id } from '@/locales/id'
import { getApiErrorCode, isNetworkError } from '@/lib/api'

export function advisorErrorMessage(error: unknown): string {
  if (isNetworkError(error)) return id.advisor.errors.network
  if (getApiErrorCode(error) === 'forbidden') {
    return id.advisor.errors.forbidden
  }
  return id.advisor.errors.unknown
}
