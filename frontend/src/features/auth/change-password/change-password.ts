import { id } from '@/locales/id'
import {
  api,
  getApiErrorCode,
  getApiErrorField,
  isNetworkError,
} from '@/lib/api'

export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128

/** Calls PUT /auth/password (docs/API.md, section 3). Resolves on 204. */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await api.put('/auth/password', {
    current_password: currentPassword,
    new_password: newPassword,
  })
}

interface ChangePasswordFailure {
  /** Form field to show the message under, or null for a toast. */
  field: 'currentPassword' | null
  message: string
}

/** Maps a failed password change to an Indonesian message. */
export function getChangePasswordFailure(
  error: unknown
): ChangePasswordFailure {
  if (isNetworkError(error)) {
    return { field: null, message: id.errors.network }
  }

  const code = getApiErrorCode(error)

  if (code === 'validation_error') {
    if (getApiErrorField(error) === 'current_password') {
      return {
        field: 'currentPassword',
        message: id.auth.changePassword.errors.currentWrong,
      }
    }
    return { field: null, message: id.errors.validation }
  }

  if (code === 'rate_limited') {
    return { field: null, message: id.errors.rateLimited }
  }

  return { field: null, message: id.errors.unknown }
}
