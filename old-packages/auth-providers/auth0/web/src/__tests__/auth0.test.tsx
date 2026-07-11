import type {
  Auth0Client,
  GetTokenSilentlyOptions,
  GetTokenSilentlyVerboseResponse,
  User,
} from '@auth0/auth0-spa-js'
import { renderHook, act } from '@testing-library/react'
import { vi, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { CurrentUser } from '@redwoodjs/auth'

import { createAuth } from '../auth0.js'

const user: User = {
  sub: 'unique_user_id',
  name: 'John',
  email: 'john.doe@example.com',
  roles: ['user'],
}

const adminUser: User = {
  sub: 'unique_user_id_admin',
  name: 'Mr Smith',
  email: 'admin@example.com',
  roles: ['user', 'admin'],
}

let loggedInUser: User | undefined

async function getTokenSilently(
  options: GetTokenSilentlyOptions & { detailedResponse: true },
): Promise<GetTokenSilentlyVerboseResponse>
async function getTokenSilently(
  options?: GetTokenSilentlyOptions,
): Promise<string>
async function getTokenSilently(): Promise<
  string | GetTokenSilentlyVerboseResponse
> {
  return 'token'
}

const auth0MockClient: Partial<Auth0Client> = {
  handleRedirectCallback: async () => ({}),
  loginWithRedirect: async () => {
    loggedInUser = user
  },
  logout: async () => {},
  getTokenSilently,
  getUser: <TUser extends User>() => {
    return new Promise<TUser | undefined>((resolve) => {
      resolve((loggedInUser as TUser) || undefined)
    })
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
  global.fetch = fetchMock
})

beforeEach(() => {
  fetchMock.mockClear()
  loggedInUser = undefined
})

function getAuth0Auth(customProviderHooks?: {
  useCurrentUser?: () => Promise<CurrentUser>
  useHasRole?: (
    currentUser: CurrentUser | null,
  ) => (rolesToCheck: string | string[]) => boolean
}) {
  const { useAuth, AuthProvider } = createAuth(
    auth0MockClient as Auth0Client,
    customProviderHooks,
  )
  const { result } = renderHook(() => useAuth(), {
    wrapper: AuthProvider,
  })

  return result
}

describe('auth0Auth', () => {
  it('is not authenticated before logging in', async () => {
    const auth = getAuth0Auth().current

    await act(async () => {
      expect(auth.isAuthenticated).toBeFalsy()
    })
  })

  it('is authenticated after logging in', async () => {
    const authRef = getAuth0Auth()

    await act(async () => {
      authRef.current.logIn()
    })

    expect(authRef.current.isAuthenticated).toBeTruthy()
  })

  it('is not authenticated after logging out', async () => {
    const authRef = getAuth0Auth()

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
    const authRef = getAuth0Auth()

    expect(authRef.current.hasRole('user')).toBeFalsy()

    await act(async () => {
      authRef.current.logIn()
    })

    expect(authRef.current.hasRole('user')).toBeTruthy()
  })

  it('has role "admin"', async () => {
    const authRef = getAuth0Auth()

    expect(authRef.current.hasRole('admin')).toBeFalsy()

    await act(async () => {
      authRef.current.logIn()
      loggedInUser = adminUser
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
          currentUser.email === 'admin@example.com'
        ) {
          return true
        }

        return false
      }
    }

    const authRef = getAuth0Auth({ useHasRole })

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

    const authRef = getAuth0Auth({ useCurrentUser })

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
