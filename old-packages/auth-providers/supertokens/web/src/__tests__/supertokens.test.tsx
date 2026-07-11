import { renderHook, act } from '@testing-library/react'
import { vi, it, expect, beforeAll, beforeEach, describe } from 'vitest'

import type { CurrentUser } from '@redwoodjs/auth'

import type {
  SuperTokensUser,
  SessionRecipe,
  SuperTokensAuth,
} from '../supertokens.js'
import { createAuth } from '../supertokens.js'

const user: SuperTokensUser = {
  userId: 'unique_user_id',
  accessTokenPayload: undefined,
}

const adminUser: SuperTokensUser = {
  userId: 'unique_user_id_admin',
  accessTokenPayload: undefined,
}

let loggedInUser: SuperTokensUser | undefined

const superTokensSessionRecipe: SessionRecipe = {
  signOut: async () => {
    loggedInUser = undefined
  },
  doesSessionExist: async () => true,
  getAccessToken: async () => 'mock_supertokens_access_token',
  getAccessTokenPayloadSecurely: async () => {
    return {
      _jwtPName: 'token',
    }
  },
  getUserId: () => {
    return new Promise((resolve, reject) => {
      if (loggedInUser) {
        resolve(loggedInUser.userId)
      } else {
        reject('User not logged in')
      }
    })
  },
}

const superTokensMockClient: SuperTokensAuth = {
  sessionRecipe: superTokensSessionRecipe,
  redirectToAuth: async () => {
    loggedInUser ||= user
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
      json: () => ({ data: { redwood: { currentUser: loggedInUser } } }),
    }
  }

  return { ok: true, text: () => '', json: () => ({}) }
})

beforeAll(() => {
  globalThis.fetch = fetchMock
})

beforeEach(() => {
  fetchMock.mockClear()
  loggedInUser = undefined
})

function getSuperTokensAuth(customProviderHooks?: {
  useCurrentUser?: () => Promise<CurrentUser>
  useHasRole?: (
    currentUser: CurrentUser | null,
  ) => (rolesToCheck: string | string[]) => boolean
}) {
  const { useAuth, AuthProvider } = createAuth(
    superTokensMockClient,
    customProviderHooks,
  )
  const { result } = renderHook(() => useAuth(), {
    wrapper: AuthProvider,
  })

  return result
}

describe('SuperTokens', () => {
  it('is not authenticated before logging in', async () => {
    const authRef = getSuperTokensAuth()

    await act(async () => {
      expect(authRef.current.isAuthenticated).toBeFalsy()
    })
  })

  it('is authenticated after logging in', async () => {
    const authRef = getSuperTokensAuth()

    await act(async () => {
      authRef.current.logIn()
    })

    expect(authRef.current.isAuthenticated).toBeTruthy()
  })

  it('is not authenticated after logging out', async () => {
    const authRef = getSuperTokensAuth()

    await act(async () => {
      authRef.current.logIn()
    })

    expect(authRef.current.isAuthenticated).toBeTruthy()

    await act(async () => {
      await authRef.current.logOut()
    })

    expect(authRef.current.isAuthenticated).toBeFalsy()
  })

  // No support for roles using SuperTokens with Redwood's default hasRole
  // implementation right now
  it.skip('has role "user"', async () => {
    const authRef = getSuperTokensAuth()

    expect(authRef.current.hasRole('user')).toBeFalsy()

    await act(async () => {
      authRef.current.logIn()
    })

    expect(authRef.current.hasRole('user')).toBeTruthy()
  })

  // No support for roles using SuperTokens with Redwood's default hasRole
  // implementation right now
  it.skip('has role "admin"', async () => {
    const authRef = getSuperTokensAuth()

    expect(authRef.current.hasRole('admin')).toBeFalsy()

    await act(async () => {
      loggedInUser = adminUser
      authRef.current.logIn()
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

        // For the admin role we check their userId
        if (
          rolesToCheck === 'admin' &&
          currentUser.userId === 'unique_user_id_admin'
        ) {
          return true
        }

        return false
      }
    }

    const authRef = getSuperTokensAuth({ useHasRole })

    expect(authRef.current.hasRole('user')).toBeFalsy()

    await act(async () => {
      authRef.current.logIn()
    })

    expect(authRef.current.hasRole('user')).toBeTruthy()
    expect(authRef.current.hasRole('admin')).toBeFalsy()

    await act(async () => {
      loggedInUser = adminUser
      authRef.current.logIn()
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

    const authRef = getSuperTokensAuth({ useCurrentUser })

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
