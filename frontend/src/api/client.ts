import axios, { type InternalAxiosRequestConfig } from 'axios'
import { ref } from 'vue'
import { getUserManager } from '@/auth/userManager'
import { getConfig } from '@/config'

const RETRY_STATUSES = [502, 503, 504]
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

apiClient.interceptors.response.use(undefined, async (error) => {
  const config: RetryableConfig | undefined = error.config
  if (!config || config._retried || !RETRY_STATUSES.includes(error.response?.status)) {
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
