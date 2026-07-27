import axios from 'axios'

export const TOKEN_STORAGE_KEY = 'gym-tracker-token'

export const apiClient = axios.create({
  baseURL: 'http://localhost:8100',
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
