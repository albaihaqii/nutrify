import { id } from '@/locales/id'
import { getApiErrorCode, isNetworkError } from '@/lib/api'

export function modelsErrorMessage(error: unknown): string {
  if (isNetworkError(error)) return id.models.errors.network

  switch (getApiErrorCode(error)) {
    case 'invalid_leaf':
      return id.models.errors.noLeaf
    case 'payload_too_large':
      return id.models.errors.tooLarge
    case 'validation_error':
      return id.models.errors.invalidImage
    default:
      return id.models.errors.unknown
  }
}
