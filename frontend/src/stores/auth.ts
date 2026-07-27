import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchCurrentUser, login as loginRequest, register as registerRequest } from '@/api/auth'
import { TOKEN_STORAGE_KEY } from '@/api/client'
import type { User } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_STORAGE_KEY))
  const user = ref<User | null>(null)

  const isAuthenticated = () => token.value !== null

  function setToken(newToken: string) {
    token.value = newToken
    localStorage.setItem(TOKEN_STORAGE_KEY, newToken)
  }

  async function login(email: string, password: string) {
    const result = await loginRequest(email, password)
    setToken(result.access_token)
    user.value = await fetchCurrentUser()
  }

  async function register(email: string, password: string, displayName?: string) {
    await registerRequest({ email, password, display_name: displayName })
    await login(email, password)
  }

  async function loadCurrentUser() {
    if (!token.value) return
    user.value = await fetchCurrentUser()
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  }

  return { token, user, isAuthenticated, login, register, loadCurrentUser, logout }
})
