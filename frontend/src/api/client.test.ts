import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { AxiosError } from 'axios'
import { apiClient, isWakingUp } from './client'

vi.mock('@/auth/userManager', () => ({
  getUserManager: () => ({ getUser: async () => ({ id_token: 'id-token-123' }) }),
}))

function respond(config: InternalAxiosRequestConfig, status: number): AxiosResponse {
  return { data: {}, status, statusText: '', headers: {}, config }
}

function failOrSucceed(config: InternalAxiosRequestConfig, status: number) {
  const response = respond(config, status)
  if (status < 400) return Promise.resolve(response)
  return Promise.reject(new AxiosError('failed', String(status), config, undefined, response))
}

describe('apiClient', () => {
  let adapter: ReturnType<typeof vi.fn<AxiosAdapter>>

  beforeEach(() => {
    vi.useFakeTimers()
    adapter = vi.fn<AxiosAdapter>()
    apiClient.defaults.adapter = adapter
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('attaches the ID token and configured base URL', async () => {
    adapter.mockImplementation((config) => failOrSucceed(config, 200))
    await apiClient.get('/auth/me')
    const config = adapter.mock.calls[0][0]
    expect(config.headers.Authorization).toBe('Bearer id-token-123')
    expect(config.baseURL).toBe('http://api.test/api')
  })

  it('retries once on 503 and shows waking state', async () => {
    adapter
      .mockImplementationOnce((config) => failOrSucceed(config, 503))
      .mockImplementationOnce((config) => failOrSucceed(config, 200))

    const request = apiClient.get('/exercises')
    await vi.advanceTimersByTimeAsync(2999)
    expect(isWakingUp.value).toBe(true)
    await vi.advanceTimersByTimeAsync(1)
    await request

    expect(adapter).toHaveBeenCalledTimes(2)
    expect(isWakingUp.value).toBe(false)
  })

  it('does not retry a second time', async () => {
    adapter.mockImplementation((config) => failOrSucceed(config, 503))

    const request = apiClient.get('/exercises')
    const assertion = expect(request).rejects.toThrow()
    await vi.advanceTimersByTimeAsync(3000)
    await assertion

    expect(adapter).toHaveBeenCalledTimes(2)
    expect(isWakingUp.value).toBe(false)
  })

  it('does not retry 4xx', async () => {
    adapter.mockImplementation((config) => failOrSucceed(config, 404))
    await expect(apiClient.get('/exercises')).rejects.toThrow()
    expect(adapter).toHaveBeenCalledTimes(1)
  })
})
