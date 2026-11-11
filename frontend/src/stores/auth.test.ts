import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { AxiosError } from 'axios'
import { useAuthStore } from './auth'
import * as authApi from '@/api/auth'
import type { User } from '@/types'

vi.mock('@/api/auth')

const manager = vi.hoisted(() => ({
  getUser: vi.fn(),
  removeUser: vi.fn(),
  signinRedirect: vi.fn(),
  signinRedirectCallback: vi.fn(),
  events: {
    addUserLoaded: vi.fn(),
    addUserUnloaded: vi.fn(),
    addSilentRenewError: vi.fn(),
  },
}))

vi.mock('@/auth/userManager', () => ({
  getUserManager: () => manager,
  cognitoLogoutUrl: () => 'https://logout.example/',
}))

const mockUser: User = {
  id: 1,
  email: 'test@example.com',
  display_name: 'Test User',
  daily_calorie_target: null,
}

const validOidcUser = { expired: false, id_token: 'tok' }

function forbidden() {
  return new AxiosError('Forbidden', '403', undefined, undefined, {
    status: 403,
    data: {},
    statusText: 'Forbidden',
    headers: {},
    config: {} as never,
  })
}

describe('auth store', () => {
  const assign = vi.fn()

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.stubGlobal('location', { origin: 'http://localhost', assign })
  })

  it('is unauthenticated when no oidc user is stored', async () => {
    manager.getUser.mockResolvedValue(null)
    const store = useAuthStore()
    await store.init()
    expect(store.isAuthenticated()).toBe(false)
  })

  it('is authenticated for a stored, unexpired oidc user', async () => {
    manager.getUser.mockResolvedValue(validOidcUser)
    const store = useAuthStore()
    await store.init()
    expect(store.isAuthenticated()).toBe(true)
  })

  it('isAuthenticated is false for an expired oidc user', async () => {
    manager.getUser.mockResolvedValue({ expired: true })
    const store = useAuthStore()
    await store.init()
    expect(store.isAuthenticated()).toBe(false)
  })

  it('signIn starts the redirect carrying the target path as state', async () => {
    const store = useAuthStore()
    await store.signIn('/meals')
    expect(manager.signinRedirect).toHaveBeenCalledWith({ state: '/meals' })
  })

  it('loadCurrentUser fetches the user when signed in', async () => {
    manager.getUser.mockResolvedValue(validOidcUser)
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(mockUser)
    const store = useAuthStore()
    await store.init()
    await store.loadCurrentUser()
    expect(store.user).toEqual(mockUser)
  })

  it('loadCurrentUser is a no-op when signed out', async () => {
    const store = useAuthStore()
    await store.loadCurrentUser()
    expect(authApi.fetchCurrentUser).not.toHaveBeenCalled()
  })

  it('loadCurrentUser 403 sets accessDenied and clears session', async () => {
    manager.getUser.mockResolvedValue(validOidcUser)
    vi.mocked(authApi.fetchCurrentUser).mockRejectedValue(forbidden())
    const store = useAuthStore()
    await store.init()
    await store.loadCurrentUser()

    expect(store.accessDenied).toBe(true)
    expect(manager.removeUser).toHaveBeenCalled()
    expect(store.user).toBeNull()
    expect(store.isAuthenticated()).toBe(false)
  })

  it('loadCurrentUser rethrows other errors', async () => {
    manager.getUser.mockResolvedValue(validOidcUser)
    vi.mocked(authApi.fetchCurrentUser).mockRejectedValue(new Error('boom'))
    const store = useAuthStore()
    await store.init()
    await expect(store.loadCurrentUser()).rejects.toThrow('boom')
  })

  it('silent renew error clears session and routes to login', async () => {
    manager.getUser.mockResolvedValue(validOidcUser)
    const store = useAuthStore()
    await store.init()

    const onRenewError = manager.events.addSilentRenewError.mock.calls[0][0]
    await onRenewError()

    expect(manager.removeUser).toHaveBeenCalled()
    expect(store.isAuthenticated()).toBe(false)
    expect(assign).toHaveBeenCalledWith('/login')
  })

  it('completeSignIn returns redirect from state, default /log', async () => {
    const store = useAuthStore()
    manager.signinRedirectCallback.mockResolvedValueOnce({ state: '/meals' })
    expect(await store.completeSignIn()).toBe('/meals')
    manager.signinRedirectCallback.mockResolvedValueOnce({ state: undefined })
    expect(await store.completeSignIn()).toBe('/log')
    manager.signinRedirectCallback.mockResolvedValueOnce({ state: '//evil.example' })
    expect(await store.completeSignIn()).toBe('/log')
  })

  it('logout clears the session and goes to the Cognito logout URL', async () => {
    manager.getUser.mockResolvedValue(validOidcUser)
    const store = useAuthStore()
    await store.init()
    await store.logout()

    expect(manager.removeUser).toHaveBeenCalled()
    expect(store.isAuthenticated()).toBe(false)
    expect(assign).toHaveBeenCalledWith('https://logout.example/')
  })
})
