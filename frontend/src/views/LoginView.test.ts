import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import LoginView from './LoginView.vue'
import { useAuthStore } from '@/stores/auth'

vi.mock('@/auth/userManager', () => ({ getUserManager: vi.fn(), cognitoLogoutUrl: vi.fn() }))

async function mountAt(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/login', name: 'login', component: LoginView }],
  })
  await router.push(path)
  await router.isReady()
  return mount(LoginView, { global: { plugins: [router] } })
}

describe('LoginView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('Sign in calls signIn with ?redirect', async () => {
    const wrapper = await mountAt('/login?redirect=%2Frecords')
    const signIn = vi.spyOn(useAuthStore(), 'signIn').mockResolvedValue()

    await wrapper.find('button').trigger('click')

    expect(wrapper.find('button').text()).toBe('Sign in')
    expect(signIn).toHaveBeenCalledWith('/records')
  })
})
