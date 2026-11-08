import { id } from '@/locales/id'
import { type AuthUser, type Session } from '@/stores/auth-store'
import { api, getApiErrorCode, isNetworkError } from '@/lib/api'

type LoginResponse = {
  access_token: string
  token_type: string
  expires_in: number
  user: AuthUser
}

/** Calls POST /auth/login and converts the response into a session. */
export async function login(email: string, password: string): Promise<Session> {
  const { data } = await api.post<LoginResponse>('/auth/login', {
    email,
    password,
  })
  return {
    accessToken: data.access_token,
    user: data.user,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
}

/** Maps a failed login request to an Indonesian message. */
export function getLoginErrorMessage(error: unknown): string {
  if (isNetworkError(error)) return id.auth.errors.network

  switch (getApiErrorCode(error)) {
    case 'invalid_credentials':
      return id.auth.errors.invalidCredentials
    case 'forbidden':
      return id.auth.errors.inactive
    case 'rate_limited':
      return id.auth.errors.tooManyAttempts
    default:
      return id.auth.errors.unknown
  }
}
