import axios from 'axios'
import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import type { User as OidcUser } from 'oidc-client-ts'
import { fetchCurrentUser, updateCurrentUser } from '@/api/auth'
import { cognitoLogoutUrl, getUserManager } from '@/auth/userManager'
import type { User } from '@/types'

const DEFAULT_REDIRECT = '/log'

export const useAuthStore = defineStore('auth', () => {
  const oidcUser = shallowRef<OidcUser | null>(null)
  const user = ref<User | null>(null)
  const accessDenied = ref(false)

  const isAuthenticated = () => oidcUser.value !== null && !oidcUser.value.expired

  function clearSession() {
    oidcUser.value = null
    user.value = null
  }

  async function init() {
    const manager = getUserManager()
    oidcUser.value = await manager.getUser()
    manager.events.addUserLoaded((loaded) => {
      oidcUser.value = loaded
    })
    manager.events.addUserUnloaded(clearSession)
    manager.events.addSilentRenewError(async () => {
      await manager.removeUser()
      clearSession()
      // The router imports this store, so the store cannot import the router.
      window.location.assign('/login')
    })
  }

  function signIn(redirect?: string) {
    return getUserManager().signinRedirect({ state: redirect })
  }

  async function completeSignIn(): Promise<string> {
    const signedIn = await getUserManager().signinRedirectCallback()
    oidcUser.value = signedIn
    const target = signedIn.state
    // Only same-origin paths, to avoid an open redirect.
    return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//')
      ? target
      : DEFAULT_REDIRECT
  }

  async function loadCurrentUser() {
    if (!oidcUser.value) return
    try {
      user.value = await fetchCurrentUser()
      accessDenied.value = false
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 403) {
        accessDenied.value = true
        await getUserManager().removeUser()
        clearSession()
        return
      }
      throw e
    }
  }

  async function logout() {
    await getUserManager().removeUser()
    clearSession()
    window.location.assign(cognitoLogoutUrl())
  }

  async function updateProfile(dailyCalorieTarget: number | null) {
    user.value = await updateCurrentUser({ daily_calorie_target: dailyCalorieTarget })
  }

  return {
    oidcUser,
    user,
    accessDenied,
    init,
    isAuthenticated,
    signIn,
    completeSignIn,
    loadCurrentUser,
    logout,
    updateProfile,
  }
})
