import { beforeEach } from 'vitest'
import { setConfigForTests } from '@/config'

beforeEach(() => {
  localStorage.clear()
  setConfigForTests({
    authority: 'https://cognito-idp.test/pool',
    clientId: 'test-client',
    cognitoDomain: 'test.auth.example.com',
    apiBaseUrl: 'http://api.test/api',
  })
})
