import { create } from 'zustand'

export const SESSION_STORAGE_KEY = 'nutrify.session'

export type UserRole = 'admin' | 'viewer'

export interface AuthUser {
  id: number
  name: string
  email: string
  role: UserRole
}

export interface Session {
  accessToken: string
  user: AuthUser
  /** Expiry as a Unix timestamp in milliseconds. */
  expiresAt: number
}

interface AuthState {
  auth: {
    accessToken: string
    user: AuthUser | null
    expiresAt: number
    setSession: (session: Session) => void
    reset: () => void
  }
}

function isSession(value: unknown): value is Session {
  if (!value || typeof value !== 'object') return false
  const session = value as Partial<Session>
  const user = session.user as Partial<AuthUser> | undefined
  return (
    typeof session.accessToken === 'string' &&
    session.accessToken.length > 0 &&
    typeof session.expiresAt === 'number' &&
    !!user &&
    typeof user.id === 'number' &&
    typeof user.name === 'string' &&
    typeof user.email === 'string' &&
    (user.role === 'admin' || user.role === 'viewer')
  )
}

function writeSession(session: Session | null) {
  try {
    if (session) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY)
    }
  } catch {
    // Storage can be blocked (private mode); the session then lives in memory only.
  }
}

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (isSession(parsed) && parsed.expiresAt > Date.now()) return parsed
    writeSession(null)
  } catch {
    // Corrupted or unreadable data is treated as "signed out".
  }
  return null
}

export function createAuthStore() {
  return create<AuthState>()((set) => {
    const stored = readSession()
    return {
      auth: {
        accessToken: stored?.accessToken ?? '',
        user: stored?.user ?? null,
        expiresAt: stored?.expiresAt ?? 0,
        setSession: (session) => {
          writeSession(session)
          set((state) => ({
            auth: {
              ...state.auth,
              accessToken: session.accessToken,
              user: session.user,
              expiresAt: session.expiresAt,
            },
          }))
        },
        reset: () => {
          writeSession(null)
          set((state) => ({
            auth: { ...state.auth, accessToken: '', user: null, expiresAt: 0 },
          }))
        },
      },
    }
  })
}

export const useAuthStore = createAuthStore()

/** True when a token exists and has not expired. */
export function isAuthenticated(): boolean {
  const { accessToken, expiresAt } = useAuthStore.getState().auth
  return accessToken !== '' && expiresAt > Date.now()
}
