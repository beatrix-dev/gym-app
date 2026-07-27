import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { AxiosError } from 'axios'
import LoginView from './LoginView.vue'
import { useAuthStore } from '@/stores/auth'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/login', name: 'login', component: LoginView },
      { path: '/log', name: 'exercise-log', component: { template: '<div />' } },
    ],
  })
}

describe('LoginView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('submits credentials and navigates to /log on success', async () => {
    const router = makeRouter()
    await router.push('/login')
    await router.isReady()

    const wrapper = mount(LoginView, { global: { plugins: [router] } })
    const authStore = useAuthStore()
    const loginSpy = vi.spyOn(authStore, 'login').mockResolvedValue()

    await wrapper.find('input[type="email"]').setValue('test@example.com')
    await wrapper.find('input[type="password"]').setValue('password123')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(loginSpy).toHaveBeenCalledWith('test@example.com', 'password123')
    expect(router.currentRoute.value.path).toBe('/log')
  })

  it('redirects to the query redirect target after login', async () => {
    const router = makeRouter()
    await router.push('/login?redirect=%2Frecords')
    await router.isReady()

    const wrapper = mount(LoginView, { global: { plugins: [router] } })
    const authStore = useAuthStore()
    vi.spyOn(authStore, 'login').mockResolvedValue()

    await wrapper.find('input[type="email"]').setValue('test@example.com')
    await wrapper.find('input[type="password"]').setValue('password123')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/records')
  })

  it('shows an error message on 401', async () => {
    const router = makeRouter()
    await router.push('/login')
    await router.isReady()

    const wrapper = mount(LoginView, { global: { plugins: [router] } })
    const authStore = useAuthStore()
    const axiosError = new AxiosError('Unauthorized', '401', undefined, undefined, {
      status: 401,
      data: {},
      statusText: 'Unauthorized',
      headers: {},
      config: {} as never,
    })
    vi.spyOn(authStore, 'login').mockRejectedValue(axiosError)

    await wrapper.find('input[type="email"]').setValue('bad@example.com')
    await wrapper.find('input[type="password"]').setValue('wrong')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('Incorrect email or password.')
  })

  it('shows a generic error message on other failures', async () => {
    const router = makeRouter()
    await router.push('/login')
    await router.isReady()

    const wrapper = mount(LoginView, { global: { plugins: [router] } })
    const authStore = useAuthStore()
    vi.spyOn(authStore, 'login').mockRejectedValue(new Error('network down'))

    await wrapper.find('input[type="email"]').setValue('test@example.com')
    await wrapper.find('input[type="password"]').setValue('password123')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('Something went wrong. Please try again.')
  })
})

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}
