import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from './auth'
import { TOKEN_STORAGE_KEY } from '@/api/client'
import * as authApi from '@/api/auth'
import type { User } from '@/types'

vi.mock('@/api/auth')

const mockUser: User = { id: 1, email: 'test@example.com', display_name: 'Test User' }

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('starts unauthenticated when no token is stored', () => {
    const store = useAuthStore()
    expect(store.isAuthenticated()).toBe(false)
    expect(store.user).toBeNull()
  })

  it('picks up an existing token from localStorage on init', () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'existing-token')
    const store = useAuthStore()
    expect(store.isAuthenticated()).toBe(true)
    expect(store.token).toBe('existing-token')
  })

  it('login stores the token and loads the current user', async () => {
    vi.mocked(authApi.login).mockResolvedValue({ access_token: 'new-token', token_type: 'bearer' })
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(mockUser)

    const store = useAuthStore()
    await store.login('test@example.com', 'password123')

    expect(authApi.login).toHaveBeenCalledWith('test@example.com', 'password123')
    expect(store.token).toBe('new-token')
    expect(store.user).toEqual(mockUser)
    expect(store.isAuthenticated()).toBe(true)
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe('new-token')
  })

  it('login propagates errors and does not set state', async () => {
    vi.mocked(authApi.login).mockRejectedValue(new Error('invalid credentials'))

    const store = useAuthStore()
    await expect(store.login('bad@example.com', 'wrong')).rejects.toThrow('invalid credentials')
    expect(store.isAuthenticated()).toBe(false)
    expect(store.user).toBeNull()
  })

  it('register registers then logs in', async () => {
    vi.mocked(authApi.register).mockResolvedValue(mockUser)
    vi.mocked(authApi.login).mockResolvedValue({ access_token: 'new-token', token_type: 'bearer' })
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(mockUser)

    const store = useAuthStore()
    await store.register('test@example.com', 'password123', 'Test User')

    expect(authApi.register).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      display_name: 'Test User',
    })
    expect(authApi.login).toHaveBeenCalledWith('test@example.com', 'password123')
    expect(store.user).toEqual(mockUser)
  })

  it('loadCurrentUser is a no-op without a token', async () => {
    const store = useAuthStore()
    await store.loadCurrentUser()
    expect(authApi.fetchCurrentUser).not.toHaveBeenCalled()
    expect(store.user).toBeNull()
  })

  it('loadCurrentUser fetches the user when a token is present', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'existing-token')
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(mockUser)

    const store = useAuthStore()
    await store.loadCurrentUser()

    expect(store.user).toEqual(mockUser)
  })

  it('logout clears token and user', async () => {
    vi.mocked(authApi.login).mockResolvedValue({ access_token: 'new-token', token_type: 'bearer' })
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(mockUser)

    const store = useAuthStore()
    await store.login('test@example.com', 'password123')
    store.logout()

    expect(store.token).toBeNull()
    expect(store.user).toBeNull()
    expect(store.isAuthenticated()).toBe(false)
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull()
  })
})
