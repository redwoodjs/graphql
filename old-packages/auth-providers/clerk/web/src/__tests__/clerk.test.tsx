import type {
  Clerk as ClerkClient,
  UserResource,
  EmailAddressResource,
  ActiveSessionResource,
} from '@clerk/types'
import { renderHook, act } from '@testing-library/react'
import { vi, expect, describe, it, beforeAll, beforeEach } from 'vitest'

import type { CurrentUser } from '@redwoodjs/auth'

import { createAuth } from '../clerk.js'

const user: Partial<UserResource> = {
  id: 'unique_user_id',
  fullName: 'John Doe',
  emailAddresses: [
    {
      id: 'email_id',
      emailAddress: 'john.doe@example.com',
    } as EmailAddressResource,
  ],
  publicMetadata: {
    roles: ['user'],
  },
}

const adminUser: Partial<UserResource> = {
  id: 'unique_user_id_admin',
  fullName: 'Mr Smith',
  emailAddresses: [
    {
      id: 'email_id',
      emailAddress: 'admin@example.com',
    } as EmailAddressResource,
  ],
  publicMetadata: {
    roles: ['user', 'admin'],
  },
}

let loggedInUser: Partial<UserResource> | undefined

const clerkMockClient: Partial<ClerkClient> = {
  openSignIn: () => {
    loggedInUser ||= user
  },
  openSignUp: () => {
    loggedInUser = user
  },
  signOut: async () => {
    loggedInUser = undefined
    return undefined
  },
  session: {
    getToken: async () => 'token',
  } as ActiveSessionResource,
  addListener: () => {
    // Unsubscribe callback
    return () => {}
  },
  get user() {
    return loggedInUser as UserResource | undefined
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
              roles: loggedInUser?.publicMetadata?.roles,
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
  globalThis.Clerk = clerkMockClient
})

beforeEach(() => {
  fetchMock.mockClear()
  loggedInUser = undefined
})

function getClerkAuth(customProviderHooks?: {
  useCurrentUser?: () => Promise<CurrentUser>
  useHasRole?: (
    currentUser: CurrentUser | null,
  ) => (rolesToCheck: string | string[]) => boolean
}) {
  const { useAuth, AuthProvider } = createAuth(customProviderHooks)
  const { result } = renderHook(() => useAuth(), {
    wrapper: AuthProvider,
  })

  return result
}

describe('Clerk', () => {
  it('is not authenticated before logging in', async () => {
    const auth = getClerkAuth().current

    await act(async () => {
      expect(auth.isAuthenticated).toBeFalsy()
    })
  })

  it('is authenticated after logging in', async () => {
    const authRef = getClerkAuth()

    await act(async () => {
      authRef.current.logIn()
    })

    expect(authRef.current.isAuthenticated).toBeTruthy()
  })

  it('is not authenticated after logging out', async () => {
    const authRef = getClerkAuth()

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
    const authRef = getClerkAuth()

    expect(authRef.current.hasRole('user')).toBeFalsy()

    await act(async () => {
      authRef.current.logIn()
    })

    expect(authRef.current.hasRole('user')).toBeTruthy()
  })

  it('has role "admin"', async () => {
    const authRef = getClerkAuth()

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

        // For the admin role we check their email address
        if (
          rolesToCheck === 'admin' &&
          (currentUser.emailAddresses as any).some(
            (email) => email.emailAddress === 'admin@example.com',
          )
        ) {
          return true
        }

        return false
      }
    }

    const authRef = getClerkAuth({ useHasRole })

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

    const authRef = getClerkAuth({ useCurrentUser })

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
