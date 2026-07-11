import { DEFAULT_COOKIE_OPTIONS as DEFAULT_SUPABASE_COOKIE_OPTIONS } from '@supabase/ssr'
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
fetchMock.mockImplementation(async (url) => {
  if (url.includes('/middleware/supabase/currentUser')) {
    return {
      ok: true,
      text: () => '',
      // Notice the nesting here is different from graphQL
      json: () => ({
        currentUser: {
          ...loggedInUser,
          roles: loggedInUser?.app_metadata?.roles,
        },
      }),
    }
  }

  throw new Error(`Unhandled fetch: ${url}`)
})

beforeAll(() => {
  globalThis.fetch = fetchMock
  // The client will automatically use middleware mode now!
  globalThis.RWJS_ENV = {
    RWJS_EXP_STREAMING_SSR: true,
  }
})

const cookieSetSpy = vi.spyOn(document, 'cookie', 'set')

beforeEach(() => {
  fetchMock.mockClear()
  mockSupabaseAuthClient.__testOnly__setMockUser(null)
  cookieSetSpy.mockClear()
  document.cookie = ''
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
/**
 * These tests build on top of supabase.test.tsx
 * and mainly check the extra functionality that gets used in middleware mode.
 */
describe('Supabase Authentication: Middleware edition', () => {
  it('is not authenticated before logging in', async () => {
    const authRef = getSupabaseAuth()

    await act(async () => {
      expect(authRef.current.isAuthenticated).toBeFalsy()
    })
  })
  // getCurrentUser fetches from middleware
  // Authprovider cookie set in signup
  // Authprovider cookie set in login - in all 5 cases
  // Authprovider cookie expired in logout
  // Authprovider cookie set OR expired in restoreAuthState
  // Check that useMiddlewareAuth is true somewhere
  // Set authprovider cookie uses the supabase default cookie options
  // Expiring the cookie sets maxage

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

        mwCurrentUserToHaveBeenCalled()

        // Sets the auth-provider cookie
        expect(document.cookie).toEqual('auth-provider=supabase')
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

        // Sets the auth-provider cookie
        checkAuthProviderCookieSet()
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

      checkAuthProviderCookieSet()
      mwCurrentUserToHaveBeenCalled()

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

      checkAuthProviderCookieDeleted()
      expect(authRef.current.isAuthenticated).toBeFalsy()
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

      checkAuthProviderCookieSet()
      mwCurrentUserToHaveBeenCalled()

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

      checkAuthProviderCookieSet()
      mwCurrentUserToHaveBeenCalled()

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

      checkAuthProviderCookieSet()
      mwCurrentUserToHaveBeenCalled()
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

      checkAuthProviderCookieSet()
      mwCurrentUserToHaveBeenCalled()
      expect(authRef.current.isAuthenticated).toBeTruthy()
      expect(appMetadata?.domain).toEqual('example.com')
      expect(appMetadata?.providerId).toEqual('sso-provider-identity-uuid')
    })
  })
})

function mwCurrentUserToHaveBeenCalled() {
  expect(fetchMock).toHaveBeenCalledWith(
    '/middleware/supabase/currentUser',
    expect.objectContaining({
      method: 'GET',
    }),
  )
}

function checkAuthProviderCookieSet() {
  expect(document.cookie).toEqual('auth-provider=supabase')

  expect(cookieSetSpy).toHaveBeenCalledWith(
    expect.stringContaining(`auth-provider=supabase`),
  )

  // We don't care about the values, just that it's using
  // 'auth-provider=supabase; Max-Age=31536000000; Path=/; SameSite=Lax',
  expect(cookieSetSpy).toHaveBeenCalledWith(
    expect.stringContaining(
      `Max-Age=${DEFAULT_SUPABASE_COOKIE_OPTIONS.maxAge}`,
    ),
  )

  expect(cookieSetSpy).toHaveBeenCalledWith(
    expect.stringContaining(`Path=${DEFAULT_SUPABASE_COOKIE_OPTIONS.path}`),
  )
}

function checkAuthProviderCookieDeleted() {
  expect(cookieSetSpy).toHaveBeenCalledWith(
    expect.stringContaining(`auth-provider=supabase`),
  )

  // We don't care about the values, just that it's using
  // Max-Age=-1 to delete the cookie
  expect(cookieSetSpy).toHaveBeenCalledWith(
    expect.stringContaining('Max-Age=-1'),
  )
}
