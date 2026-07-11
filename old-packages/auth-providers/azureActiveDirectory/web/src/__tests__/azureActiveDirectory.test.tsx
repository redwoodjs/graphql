import type {
  AccountInfo,
  PublicClientApplication as AzureActiveDirectoryClient,
  RedirectRequest,
} from '@azure/msal-browser'
import { renderHook, act } from '@testing-library/react'
import { vi, it, expect, describe, beforeAll, beforeEach } from 'vitest'

import type { CurrentUser } from '@redwoodjs/auth'

import { createAuth } from '../azureActiveDirectory.js'

const user: AccountInfo = {
  name: 'John',
  username: 'john.doe@example.com',
  idTokenClaims: {
    roles: ['user'],
  },
  homeAccountId: 'home_account_id',
  environment: 'environment',
  tenantId: 'tenant_id',
  localAccountId: 'local_account_id',
}

const adminUser: AccountInfo = {
  name: 'Mr Smith',
  username: 'admin@example.com',
  idTokenClaims: {
    roles: ['user', 'admin'],
  },
  homeAccountId: 'home_account_id',
  environment: 'environment',
  tenantId: 'tenant_id',
  localAccountId: 'local_account_id',
}

let loggedInUser: AccountInfo | null = null

const defaultToken = () => ({
  authority: 'authority',
  uniqueId: 'unique_id',
  tenantId: 'tenant_id',
  scopes: ['scope'],
  account: {
    homeAccountId: 'home_account_id',
    environment: 'environment',
    tenantId: 'tenant_id',
    username: loggedInUser?.username || '',
    localAccountId: 'local_account_id',
  },
  idToken: 'id_token',
  idTokenClaims: {},
  accessToken: 'access_token',
  fromCache: true,
  expiresOn: new Date(),
  tokenType: 'jwt',
  correlationId: 'correlation_id',
})

const azureActiveDirectoryMockClient: Partial<AzureActiveDirectoryClient> = {
  loginRedirect: async (options?: RedirectRequest) => {
    const claims = JSON.parse(options?.claims || '{}')
    if (claims.accessToken?.find((token) => token.name === 'role')) {
      loggedInUser = adminUser
    } else {
      loggedInUser = user
    }
  },
  logoutRedirect: async () => {
    loggedInUser = null
  },
  acquireTokenSilent: async () => {
    return defaultToken()
  },
  getActiveAccount: () => loggedInUser,
  handleRedirectPromise: async () => defaultToken(),
  getAllAccounts: () => (loggedInUser ? [loggedInUser] : []),
  setActiveAccount: (account: AccountInfo | null) => {
    loggedInUser = account
  },
}

const fetchMock = vi.fn()
fetchMock.mockImplementation(async (_url, options) => {
  const body = options?.body ? JSON.parse(options.body) : {}

  if (
    body.query ===
    'query __REDWOOD__AUTH_GET_CURRENT_USER { redwood { currentUser } }'
  ) {
    return {
      ok: true,
      text: () => '',
      json: () => ({
        data: {
          redwood: {
            currentUser: {
              ...loggedInUser,
              roles: loggedInUser?.idTokenClaims?.roles,
            },
          },
        },
      }),
    }
  }

  return { ok: true, text: () => '', json: () => ({}) }
})

beforeAll(() => {
  globalThis.fetch = fetchMock
})

beforeEach(() => {
  fetchMock.mockClear()
  loggedInUser = null
})

function getAzureActiveDirectoryAuth(customProviderHooks?: {
  useCurrentUser?: () => Promise<CurrentUser>
  useHasRole?: (
    currentUser: CurrentUser | null,
  ) => (rolesToCheck: string | string[]) => boolean
}) {
  const { useAuth, AuthProvider } = createAuth(
    azureActiveDirectoryMockClient as AzureActiveDirectoryClient,
    customProviderHooks,
  )
  const { result } = renderHook(() => useAuth(), {
    wrapper: AuthProvider,
  })

  return result
}

describe('azureActiveDirectoryAuth', () => {
  it('is not authenticated before logging in', async () => {
    const auth = getAzureActiveDirectoryAuth().current

    await act(async () => {
      expect(auth.isAuthenticated).toBeFalsy()
    })
  })

  it('is authenticated after logging in', async () => {
    const authRef = getAzureActiveDirectoryAuth()

    await act(async () => {
      authRef.current.logIn()
    })

    expect(authRef.current.isAuthenticated).toBeTruthy()
  })

  it('is not authenticated after logging out', async () => {
    const authRef = getAzureActiveDirectoryAuth()

    await act(async () => {
      authRef.current.logIn()
    })

    expect(authRef.current.isAuthenticated).toBeTruthy()

    await act(async () => {
      authRef.current.logOut()
    })

    expect(authRef.current.isAuthenticated).toBeFalsy()
  })

  it('has role "user"', async () => {
    const authRef = getAzureActiveDirectoryAuth()

    expect(authRef.current.hasRole('user')).toBeFalsy()

    await act(async () => {
      authRef.current.logIn()
    })

    expect(authRef.current.hasRole('user')).toBeTruthy()
  })

  it('has role "admin"', async () => {
    const authRef = getAzureActiveDirectoryAuth()

    expect(authRef.current.hasRole('admin')).toBeFalsy()

    await act(async () => {
      const claimsRequest = {
        idToken: [
          { name: 'name', essential: true },
          { name: 'email', essential: true },
          { name: 'country', essential: false },
        ],
        accessToken: [
          { name: 'role', essential: true },
          { name: 'permissions', essential: true },
        ],
      }

      authRef.current.logIn({
        scopes: ['openid', 'profile'],
        claims: JSON.stringify(claimsRequest),
      })
    })

    expect(authRef.current.hasRole('admin')).toBeTruthy()
  })

  it('can specify custom hasRole function', async () => {
    function useHasRole(currentUser: CurrentUser | null) {
      return (rolesToCheck: string | string[]) => {
        if (!currentUser || typeof rolesToCheck !== 'string') {
          return false
        }

        if (rolesToCheck === 'user') {
          // Everyone has role "user"
          return true
        }

        // For the admin role we check their email address
        if (
          rolesToCheck === 'admin' &&
          currentUser.username === 'admin@example.com'
        ) {
          return true
        }

        return false
      }
    }

    const authRef = getAzureActiveDirectoryAuth({ useHasRole })

    expect(authRef.current.hasRole('user')).toBeFalsy()

    await act(async () => {
      authRef.current.logIn()
    })

    expect(authRef.current.hasRole('user')).toBeTruthy()
    expect(authRef.current.hasRole('admin')).toBeFalsy()

    await act(async () => {
      authRef.current.logIn()
      loggedInUser = adminUser
    })

    expect(authRef.current.hasRole('user')).toBeTruthy()
    expect(authRef.current.hasRole('admin')).toBeTruthy()
  })

  it('can specify custom getCurrentUser function', async () => {
    async function useCurrentUser() {
      return {
        ...loggedInUser,
        roles: ['custom-current-user'],
      }
    }

    const authRef = getAzureActiveDirectoryAuth({ useCurrentUser })

    // Need to be logged in, otherwise getCurrentUser won't be invoked
    await act(async () => {
      authRef.current.logIn()
    })

    await act(async () => {
      expect(authRef.current.hasRole('user')).toBeFalsy()
      expect(authRef.current.hasRole('custom-current-user')).toBeTruthy()
    })
  })
})
