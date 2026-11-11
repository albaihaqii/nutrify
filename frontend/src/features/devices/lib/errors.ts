import { id } from '@/locales/id'
import { getApiErrorCode, isNetworkError } from '@/lib/api'

/** Indonesian message for a failed device request. */
export function deviceErrorMessage(error: unknown): string {
  if (isNetworkError(error)) return id.devices.errors.network

  switch (getApiErrorCode(error)) {
    case 'conflict':
      return id.devices.errors.conflict
    case 'validation_error':
      return id.devices.errors.validation
    case 'forbidden':
      return id.devices.errors.forbidden
    case 'not_found':
      return id.devices.errors.notFound
    default:
      return id.devices.errors.unknown
  }
}
