import axios, { AxiosError } from 'axios'
import { useAuthStore } from '@/stores/auth-store'

type ApiErrorBody = {
  error?: { code?: string; message?: string }
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15_000,
})

api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState().auth
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

/** Returns the backend error code (docs/API.md, section 1.3), or null. */
export function getApiErrorCode(error: unknown): string | null {
  if (error instanceof AxiosError) {
    const body = error.response?.data as ApiErrorBody | undefined
    return body?.error?.code ?? null
  }
  return null
}

/** True when the request never reached the server (offline, CORS, server down). */
export function isNetworkError(error: unknown): boolean {
  return error instanceof AxiosError && !error.response
}
