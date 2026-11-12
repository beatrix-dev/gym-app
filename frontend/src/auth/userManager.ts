import { UserManager, WebStorageStateStore } from 'oidc-client-ts'
import { getConfig } from '@/config'

let userManager: UserManager | null = null

export function getUserManager(): UserManager {
  if (!userManager) {
    const { authority, clientId } = getConfig()
    userManager = new UserManager({
      authority,
      client_id: clientId,
      redirect_uri: `${window.location.origin}/auth/callback`,
      post_logout_redirect_uri: `${window.location.origin}/`,
      response_type: 'code',
      scope: 'openid email profile',
      extraQueryParams: { identity_provider: 'Google' },
      automaticSilentRenew: true,
      userStore: new WebStorageStateStore({ store: window.localStorage }),
    })
  }
  return userManager
}

// Cognito has no OIDC end_session_endpoint, so logout uses its own /logout URL.
export function cognitoLogoutUrl(): string {
  const { cognitoDomain, clientId } = getConfig()
  const logoutUri = encodeURIComponent(`${window.location.origin}/`)
  return `https://${cognitoDomain}/logout?client_id=${encodeURIComponent(clientId)}&logout_uri=${logoutUri}`
}
