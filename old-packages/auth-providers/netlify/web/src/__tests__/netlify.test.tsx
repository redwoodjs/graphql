import { renderHook, act } from '@testing-library/react'
import type * as NetlifyIdentityNS from 'netlify-identity-widget'
import { vi, expect, it, beforeAll, beforeEach, describe } from 'vitest'

import type { CurrentUser } from '@redwoodjs/auth'

import { createAuth } from '../netlify.js'

type NetlifyIdentity = typeof NetlifyIdentityNS
type User = NetlifyIdentityNS.User

// return user?.token?.access_token || null

const user: Partial<User> = {
  id: 'unique_user_id',
  user_metadata: {
    full_name: 'John Doe',
  },
  email: 'john.doe@example.com',
  app_metadata: {
    provider: 'netlify',
    roles: ['user'],
  },
  token: {
    access_token: 'mock_access_token',
    refresh_token: 'mock_refresh_token',
    expires_in: 3600,
    token_type: 'Bearer',
    expires_at: 1234567890,
  },
}

const adminUser: Partial<User> = {
  id: 'unique_user_id_admin',
  user_metadata: {
    full_name: 'Mr Smith',
  },
  email: 'admin@example.com',
  app_metadata: {
    provider: 'netlify',
    roles: ['user', 'admin'],
  },
  token: {
    access_token: 'mock_access_token',
    refresh_token: 'mock_refresh_token',
    expires_in: 3600,
    token_type: 'Bearer',
    expires_at: 1234567890,
  },
}

let loggedInUser: User | undefined

function on(event: 'init', cb: (user: User | null) => void): void
function on(event: 'login', cb: (user: User) => void): void
function on(event: 'logout' | 'open' | 'close', cb: () => void): void
function on(event: 'error', cb: (err: Error) => void): void
function on(_event: unknown, cb: (arg?: any) => void) {
  cb()
}

const netlifyIdentityMockClient: Partial<NetlifyIdentity> = {
  open: () => {
    loggedInUser ||= user as User
    return loggedInUser
  },
  on,
  close: () => {},
  logout: async () => {
    loggedInUser = undefined
  },
  refresh: async () => 'token',
  currentUser: () => loggedInUser || null,
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
              roles: loggedInUser?.app_metadata?.roles,
            },
          },
        },
      }),
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

function getNetlifyAuth(customProviderHooks?: {
  useCurrentUser?: () => Promise<CurrentUser>
  useHasRole?: (
    currentUser: CurrentUser | null,
  ) => (rolesToCheck: string | string[]) => boolean
}) {
  const { useAuth, AuthProvider } = createAuth(
    netlifyIdentityMockClient as NetlifyIdentity,
    customProviderHooks,
  )
  const { result } = renderHook(() => useAuth(), {
    wrapper: AuthProvider,
  })

  return result
}

describe('Netlify', () => {
  it('is not authenticated before logging in', async () => {
    const auth = getNetlifyAuth().current

    await act(async () => {
      expect(auth.isAuthenticated).toBeFalsy()
    })
  })

  it('is authenticated after logging in', async () => {
    const authRef = getNetlifyAuth()

    await act(async () => {
      authRef.current.logIn()
    })

    expect(authRef.current.isAuthenticated).toBeTruthy()
  })

  it('is not authenticated after logging out', async () => {
    const authRef = getNetlifyAuth()

    await act(async () => {
      authRef.current.logIn()
    })

    expect(authRef.current.isAuthenticated).toBeTruthy()

    await act(async () => {
      await authRef.current.logOut()
    })

    expect(authRef.current.isAuthenticated).toBeFalsy()
  })

  it('has role "user"', async () => {
    const authRef = getNetlifyAuth()

    expect(authRef.current.hasRole('user')).toBeFalsy()

    await act(async () => {
      authRef.current.logIn()
    })

    expect(authRef.current.hasRole('user')).toBeTruthy()
  })

  it('has role "admin"', async () => {
    const authRef = getNetlifyAuth()

    expect(authRef.current.hasRole('admin')).toBeFalsy()

    await act(async () => {
      loggedInUser = adminUser as User
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

    const authRef = getNetlifyAuth({ useHasRole })

    expect(authRef.current.hasRole('user')).toBeFalsy()

    await act(async () => {
      authRef.current.logIn()
    })

    expect(authRef.current.hasRole('user')).toBeTruthy()
    expect(authRef.current.hasRole('admin')).toBeFalsy()

    await act(async () => {
      loggedInUser = adminUser as User
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

    const authRef = getNetlifyAuth({ useCurrentUser })

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
