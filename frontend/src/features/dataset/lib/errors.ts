import { id } from '@/locales/id'
import { getApiErrorCode, isNetworkError } from '@/lib/api'

export function datasetErrorMessage(error: unknown): string {
  if (isNetworkError(error)) return id.dataset.errors.network
  if (getApiErrorCode(error) === 'forbidden') {
    return id.dataset.errors.forbidden
  }
  if (getApiErrorCode(error) === 'service_unavailable') {
    return id.dataset.errors.noMoment
  }
  return id.dataset.errors.unknown
}
