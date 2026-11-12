import axios, { type InternalAxiosRequestConfig } from 'axios'
import { ref } from 'vue'
import { getUserManager } from '@/auth/userManager'
import { getConfig } from '@/config'

// 503: API Gateway found no healthy target, so the request was never processed
// and is safe to replay for any method. 502/504 can mean the backend processed
// it (e.g. a write that outlasted the gateway timeout), so only replay reads.
const ALWAYS_RETRY_STATUSES = [503]
const SAFE_METHOD_RETRY_STATUSES = [502, 504]
const SAFE_METHODS = ['get', 'head']
const RETRY_DELAY_MS = 3000

// True while waiting to retry, i.e. the serverless database is waking up.
export const isWakingUp = ref(false)

export const apiClient = axios.create()

apiClient.interceptors.request.use(async (config) => {
  config.baseURL = getConfig().apiBaseUrl
  const user = await getUserManager().getUser()
  if (user?.id_token) {
    config.headers.Authorization = `Bearer ${user.id_token}`
  }
  return config
})

type RetryableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

function isRetryable(config: RetryableConfig, status: number | undefined): boolean {
  if (config._retried || status === undefined) return false
  if (ALWAYS_RETRY_STATUSES.includes(status)) return true
  return (
    SAFE_METHOD_RETRY_STATUSES.includes(status) &&
    SAFE_METHODS.includes(config.method?.toLowerCase() ?? '')
  )
}

apiClient.interceptors.response.use(undefined, async (error) => {
  const config: RetryableConfig | undefined = error.config
  if (!config || !isRetryable(config, error.response?.status)) {
    throw error
  }
  config._retried = true
  isWakingUp.value = true
  try {
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
  } finally {
    isWakingUp.value = false
  }
  return apiClient.request(config)
})
