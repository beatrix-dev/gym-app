import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { TOKEN_STORAGE_KEY } from '@/api/client'
import router from './index'

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
    localStorage.setItem(TOKEN_STORAGE_KEY, 'a-token')
    await router.push('/records')
    expect(router.currentRoute.value.name).toBe('personal-records')
  })

  it('redirects authenticated users away from public-only routes', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'a-token')
    await router.push('/login')
    expect(router.currentRoute.value.name).toBe('exercise-log')
  })

  it('redirects root to the exercise log route', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'a-token')
    await router.push('/')
    expect(router.currentRoute.value.name).toBe('exercise-log')
  })
})
