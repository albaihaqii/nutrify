import { id } from '@/locales/id'
import { isNetworkError } from '@/lib/api'

export function modelsErrorMessage(error: unknown): string {
  return isNetworkError(error)
    ? id.models.errors.network
    : id.models.errors.unknown
}
