import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { AxiosError } from 'axios'
import RegisterView from './RegisterView.vue'
import { useAuthStore } from '@/stores/auth'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/register', name: 'register', component: RegisterView },
      { path: '/log', name: 'exercise-log', component: { template: '<div />' } },
    ],
  })
}

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

describe('RegisterView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('registers and navigates to /log on success', async () => {
    const router = makeRouter()
    await router.push('/register')
    await router.isReady()

    const wrapper = mount(RegisterView, { global: { plugins: [router] } })
    const authStore = useAuthStore()
    const registerSpy = vi.spyOn(authStore, 'register').mockResolvedValue()

    await wrapper.find('input[type="text"]').setValue('Test User')
    await wrapper.find('input[type="email"]').setValue('test@example.com')
    await wrapper.find('input[type="password"]').setValue('password123')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(registerSpy).toHaveBeenCalledWith('test@example.com', 'password123', 'Test User')
    expect(router.currentRoute.value.path).toBe('/log')
  })

  it('passes undefined display name when left blank', async () => {
    const router = makeRouter()
    await router.push('/register')
    await router.isReady()

    const wrapper = mount(RegisterView, { global: { plugins: [router] } })
    const authStore = useAuthStore()
    const registerSpy = vi.spyOn(authStore, 'register').mockResolvedValue()

    await wrapper.find('input[type="email"]').setValue('test@example.com')
    await wrapper.find('input[type="password"]').setValue('password123')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(registerSpy).toHaveBeenCalledWith('test@example.com', 'password123', undefined)
  })

  it('shows an error message when the email is already registered', async () => {
    const router = makeRouter()
    await router.push('/register')
    await router.isReady()

    const wrapper = mount(RegisterView, { global: { plugins: [router] } })
    const authStore = useAuthStore()
    const axiosError = new AxiosError('Bad Request', '400', undefined, undefined, {
      status: 400,
      data: {},
      statusText: 'Bad Request',
      headers: {},
      config: {} as never,
    })
    vi.spyOn(authStore, 'register').mockRejectedValue(axiosError)

    await wrapper.find('input[type="email"]').setValue('test@example.com')
    await wrapper.find('input[type="password"]').setValue('password123')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('Email already registered.')
  })
})
