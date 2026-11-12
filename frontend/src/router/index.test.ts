import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import router from './index'

vi.mock('@/auth/userManager', () => ({ getUserManager: vi.fn(), cognitoLogoutUrl: vi.fn() }))

function signIn() {
  useAuthStore().oidcUser = { expired: false } as never
}

describe('router navigation guard', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('redirects unauthenticated users to login for protected routes', async () => {
    await router.push('/log')
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/log')
  })

  it('allows unauthenticated users to reach public routes', async () => {
    await router.push('/login')
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('allows authenticated users to reach protected routes', async () => {
    signIn()
    await router.push('/records')
    expect(router.currentRoute.value.name).toBe('personal-records')
  })

  it('redirects authenticated users away from public-only routes', async () => {
    signIn()
    await router.push('/login')
    expect(router.currentRoute.value.name).toBe('exercise-log')
  })

  it('/auth/callback is public', async () => {
    await router.push('/auth/callback')
    expect(router.currentRoute.value.name).toBe('auth-callback')
  })

  it('/register no longer exists', () => {
    expect(router.resolve('/register').matched).toHaveLength(0)
  })

  it('redirects root to the exercise log route', async () => {
    signIn()
    await router.push('/')
    expect(router.currentRoute.value.name).toBe('exercise-log')
  })
})
