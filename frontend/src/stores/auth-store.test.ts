import { beforeEach, describe, expect, it } from 'vitest'
import { createAuthStore, isAuthenticated, useAuthStore } from './auth-store'

const KEY = 'nutrify.session'

function makeSession(expiresAt = Date.now() + 60_000) {
  return {
    accessToken: 'token-1',
    user: {
      id: 1,
      name: 'Admin',
      email: 'admin@nutrify.id',
      role: 'admin' as const,
    },
    expiresAt,
  }
}

describe('auth store', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.getState().auth.reset()
  })

  it('starts signed out when nothing is stored', () => {
    const { auth } = createAuthStore().getState()

    expect(auth.accessToken).toBe('')
    expect(auth.user).toBeNull()
  })

  it('keeps the session after a reload', () => {
    const session = makeSession()
    createAuthStore().getState().auth.setSession(session)

    const { auth } = createAuthStore().getState()

    expect(auth.accessToken).toBe('token-1')
    expect(auth.user).toEqual(session.user)
    expect(auth.expiresAt).toBe(session.expiresAt)
  })

  it('clears memory and storage on reset', () => {
    const store = createAuthStore()
    store.getState().auth.setSession(makeSession())

    store.getState().auth.reset()

    expect(store.getState().auth.accessToken).toBe('')
    expect(store.getState().auth.user).toBeNull()
    expect(localStorage.getItem(KEY)).toBeNull()
    expect(createAuthStore().getState().auth.accessToken).toBe('')
  })

  it('drops an expired stored session', () => {
    localStorage.setItem(KEY, JSON.stringify(makeSession(Date.now() - 1)))

    const { auth } = createAuthStore().getState()

    expect(auth.accessToken).toBe('')
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('ignores corrupted stored data', () => {
    localStorage.setItem(KEY, '{not valid json')

    const { auth } = createAuthStore().getState()

    expect(auth.accessToken).toBe('')
    expect(auth.user).toBeNull()
  })

  it('reports whether the shared session is still valid', () => {
    expect(isAuthenticated()).toBe(false)

    useAuthStore.getState().auth.setSession(makeSession())
    expect(isAuthenticated()).toBe(true)

    useAuthStore.getState().auth.setSession(makeSession(Date.now() - 1))
    expect(isAuthenticated()).toBe(false)
  })
})
