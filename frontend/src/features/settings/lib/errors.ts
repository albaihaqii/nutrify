import { id } from '@/locales/id'
import { getApiErrorCode, isNetworkError } from '@/lib/api'

export function settingsErrorMessage(error: unknown): string {
  if (isNetworkError(error)) return id.settings.errors.network

  switch (getApiErrorCode(error)) {
    case 'forbidden':
      return id.settings.errors.forbidden
    case 'validation_error':
      return id.settings.errors.validation
    default:
      return id.settings.errors.unknown
  }
}
