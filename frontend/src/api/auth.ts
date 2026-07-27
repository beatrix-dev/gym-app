import { apiClient } from './client'
import type { User } from '@/types'

export interface RegisterPayload {
  email: string
  password: string
  display_name?: string | null
}

export interface Token {
  access_token: string
  token_type: string
}

export async function register(payload: RegisterPayload): Promise<User> {
  const { data } = await apiClient.post<User>('/auth/register', payload)
  return data
}

export async function login(email: string, password: string): Promise<Token> {
  const body = new URLSearchParams()
  body.set('username', email)
  body.set('password', password)

  const { data } = await apiClient.post<Token>('/auth/login', body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  return data
}

export async function fetchCurrentUser(): Promise<User> {
  const { data } = await apiClient.get<User>('/auth/me')
  return data
}
