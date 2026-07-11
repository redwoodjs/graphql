import type { SupabaseClient, User } from '@supabase/supabase-js'
import { renderHook, act } from '@testing-library/react'
import { vi, it, describe, beforeAll, beforeEach, expect } from 'vitest'

import type { CurrentUser } from '@redwoodjs/auth'

import { createAuth } from '../supabase.js'

import {
  mockSupabaseAuthClient,
  loggedInUser,
  adminUser,
} from './mockSupabaseAuthClient.js'

const supabaseMockClient = {
  auth: mockSupabaseAuthClient,
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
  globalThis.fetch = fetchMock
  globalThis.RWJS_ENV = {}
})

beforeEach(() => {
  fetchMock.mockClear()
  mockSupabaseAuthClient.__testOnly__setMockUser(null)
})

function getSupabaseAuth(customProviderHooks?: {
  useCurrentUser?: () => Promise<CurrentUser>
  useHasRole?: (
    currentUser: CurrentUser | null,
  ) => (rolesToCheck: string | string[]) => boolean
}) {
  const { useAuth, AuthProvider } = createAuth(
    // @ts-expect-error It's a partial mock!
    supabaseMockClient as SupabaseClient,
    customProviderHooks,
  )
  const { result } = renderHook(() => useAuth(), {
    wrapper: AuthProvider,
  })

  return result
}

describe('Supabase Authentication', () => {
  it('is not authenticated before logging in', async () => {
    const authRef = getSupabaseAuth()

    await act(async () => {
      expect(authRef.current.isAuthenticated).toBeFalsy()
    })
  })

  describe('Password Authentication', () => {
    describe('Sign up', () => {
      it('is authenticated after signing up with username and password', async () => {
        const authRef = getSupabaseAuth()

        await act(async () => {
          authRef.current.signUp({
            email: 'jane.doe@example.com',
            password: 'ThereIsNoSpoon',
          })
        })

        const currentUser = authRef.current.currentUser

        expect(authRef.current.isAuthenticated).toBeTruthy()
        expect(currentUser?.email).toEqual('jane.doe@example.com')
      })

      it('is authenticated after signing up with username and password and additional metadata', async () => {
        const authRef = getSupabaseAuth()

        await act(async () => {
          authRef.current.signUp({
            email: 'jane.doe@example.com',
            password: 'ThereIsNoSpoon',
            options: {
              data: {
                first_name: 'Jane',
                age: 27,
              },
            },
          })
        })

        const currentUser = authRef.current.currentUser
        const userMetadata = authRef.current.userMetadata

        expect(authRef.current.isAuthenticated).toBeTruthy()
        expect(currentUser?.email).toEqual('jane.doe@example.com')
        expect(userMetadata?.data?.first_name).toEqual('Jane')
        expect(userMetadata?.data?.age).toEqual(27)
      })

      it('is authenticated after signing up with username and password and a redirect URL', async () => {
        const authRef = getSupabaseAuth()

        await act(async () => {
          authRef.current.signUp({
            email: 'example@email.com',
            password: 'example-password',
            options: {
              emailRedirectTo: 'https://example.com/welcome',
            },
          })
        })

        const currentUser = authRef.current.currentUser

        expect(authRef.current.isAuthenticated).toBeTruthy()
        expect(currentUser?.email).toEqual('example@email.com')
      })
    })

    it('is authenticated after logging in', async () => {
      const authRef = getSupabaseAuth()

      await act(async () => {
        authRef.current.logIn({
          authMethod: 'password',
          email: 'john.doe@example.com',
          password: 'ThereIsNoSpoon',
        })
      })

      const currentUser = authRef.current.currentUser

      expect(authRef.current.isAuthenticated).toBeTruthy()
      expect(currentUser?.email).toEqual('john.doe@example.com')
    })

    it('is not authenticated after logging out', async () => {
      const authRef = getSupabaseAuth()

      await act(async () => {
        authRef.current.logIn({
          authMethod: 'password',
          email: 'john.doe@example.com',
          password: 'ThereIsNoSpoon',
        })
      })

      expect(authRef.current.isAuthenticated).toBeTruthy()

      await act(async () => {
        await authRef.current.logOut()
      })

      expect(authRef.current.isAuthenticated).toBeFalsy()
    })

    it('has role "user"', async () => {
      const authRef = getSupabaseAuth()

      expect(authRef.current.hasRole('user')).toBeFalsy()

      await act(async () => {
        authRef.current.logIn({
          authMethod: 'password',
          email: 'john.doe@example.com',
          password: 'ThereIsNoSpoon',
        })
      })

      expect(authRef.current.hasRole('user')).toBeTruthy()
    })

    it('has role "admin"', async () => {
      const authRef = getSupabaseAuth()

      expect(authRef.current.hasRole('admin')).toBeFalsy()

      await act(async () => {
        mockSupabaseAuthClient.__testOnly__setMockUser(adminUser)
        authRef.current.logIn({
          authMethod: 'password',
          email: 'admin@example.com',
          password: 'RedPill',
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
            currentUser.email === 'admin@example.com'
          ) {
            return true
          }

          return false
        }
      }

      const authRef = getSupabaseAuth({ useHasRole })

      expect(authRef.current.hasRole('user')).toBeFalsy()

      await act(async () => {
        authRef.current.logIn({
          authMethod: 'password',
          email: 'john.doe@example.com',
          password: 'ThereIsNoSpoon',
        })
      })

      expect(authRef.current.hasRole('user')).toBeTruthy()
      expect(authRef.current.hasRole('admin')).toBeFalsy()

      await act(async () => {
        mockSupabaseAuthClient.__testOnly__setMockUser(adminUser)
        authRef.current.logIn({
          authMethod: 'password',
          email: 'admin@example.com',
          password: 'RedPill',
        })
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

      const authRef = getSupabaseAuth({ useCurrentUser })

      // Need to be logged in, otherwise getCurrentUser won't be invoked
      await act(async () => {
        authRef.current.logIn({
          authMethod: 'password',
          email: 'john.doe@example.com',
          password: 'ThereIsNoSpoon',
        })
      })

      await act(async () => {
        expect(authRef.current.hasRole('user')).toBeFalsy()
        expect(authRef.current.hasRole('custom-current-user')).toBeTruthy()
      })
    })
  })

  describe('OAuth Authentication', () => {
    it('is authenticated after logging in with an OAuth provider', async () => {
      const authRef = getSupabaseAuth()

      await act(async () => {
        authRef.current.logIn({
          authMethod: 'oauth',
          provider: 'github',
        })
      })

      // In a real RW app the type for `currentUser` is generated from the
      // return type of getCurrentUser in api/lib/auth. Here we have to
      // cast it to the correct type
      const currentUser = authRef.current.currentUser as User | null

      expect(authRef.current.isAuthenticated).toBeTruthy()
      expect(currentUser?.app_metadata?.provider).toEqual('github')
    })
  })

  describe('Passwordless/OTP Authentication', () => {
    it('is authenticated after logging just an email', async () => {
      const authRef = getSupabaseAuth()

      await act(async () => {
        authRef.current.logIn({
          authMethod: 'otp',
          email: 'les@example.com',
        })
      })

      // In a real RW app the type for `currentUser` is generated from the
      // return type of getCurrentUser in api/lib/auth. Here we have to
      // cast it to the correct type
      const currentUser = authRef.current.currentUser as User | null

      expect(authRef.current.isAuthenticated).toBeTruthy()
      expect(currentUser?.email).toEqual('les@example.com')
    })
  })

  describe('IDToken Authentication', () => {
    it('is authenticated after logging with Apple IDToken', async () => {
      const authRef = getSupabaseAuth()

      await act(async () => {
        authRef.current.logIn({
          authMethod: 'id_token',
          provider: 'apple',
          token: 'cortland-apple-id-token',
        })
      })

      // In a real RW app the type for `currentUser` is generated from the
      // return type of getCurrentUser in api/lib/auth. Here we have to
      // cast it to the correct type
      const currentUser = authRef.current.currentUser as User | null
      const appMetadata = currentUser?.app_metadata

      expect(authRef.current.isAuthenticated).toBeTruthy()
      expect(appMetadata?.access_token).toEqual('token cortland-apple-id-token')
      expect(appMetadata?.token_type).toEqual('Bearer apple')
    })
  })

  describe('SSO Authentication', () => {
    it('is authenticated after logging with SSO', async () => {
      const authRef = getSupabaseAuth()

      await act(async () => {
        authRef.current.logIn({
          authMethod: 'sso',
          providerId: 'sso-provider-identity-uuid',
          domain: 'example.com',
        })
      })

      // In a real RW app the type for `currentUser` is generated from the
      // return type of getCurrentUser in api/lib/auth. Here we have to
      // cast it to the correct type
      const currentUser = authRef.current.currentUser as User | null
      const appMetadata = currentUser?.app_metadata

      expect(authRef.current.isAuthenticated).toBeTruthy()
      expect(appMetadata?.domain).toEqual('example.com')
      expect(appMetadata?.providerId).toEqual('sso-provider-identity-uuid')
    })
  })
})
