import axios from 'axios'

export const TOKEN_STORAGE_KEY = 'gym-tracker-token'

// In dev this defaults to the local backend; in prod it's built with
// VITE_API_BASE_URL="" so requests are relative and nginx proxies them
// in-cluster (the LB IP isn't known until after the cluster is provisioned).
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8100',
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
