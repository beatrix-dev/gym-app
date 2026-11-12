import { apiClient } from './client'
import type { User } from '@/types'

export async function fetchCurrentUser(): Promise<User> {
  const { data } = await apiClient.get<User>('/auth/me')
  return data
}

export async function updateCurrentUser(payload: {
  daily_calorie_target: number | null
}): Promise<User> {
  const { data } = await apiClient.patch<User>('/auth/me', payload)
  return data
}
