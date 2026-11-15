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

  const isAuthenticated = () => oidcUser.value !== null && !oidcUser.value.expired

  function clearSession() {
    oidcUser.value = null
    user.value = null
  }

  async function init() {
    const manager = getUserManager()
    oidcUser.value = await manager.getUser()
    // oidc-client-ts schedules no renewal for an already-expired token, so use
    // the refresh token now instead of sending the user back to login.
    if (oidcUser.value?.expired && oidcUser.value.refresh_token) {
      try {
        oidcUser.value = await manager.signinSilent()
      } catch {
        await manager.removeUser()
        clearSession()
      }
    }
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
    user.value = await fetchCurrentUser()
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
    init,
    isAuthenticated,
    signIn,
    completeSignIn,
    loadCurrentUser,
    logout,
    updateProfile,
  }
})
