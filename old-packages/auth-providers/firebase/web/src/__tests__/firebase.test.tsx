import { renderHook, act } from '@testing-library/react'
import type FirebaseAuthNamespace from 'firebase/auth'
import type { User, OAuthProvider, Auth } from 'firebase/auth'
import { OperationType } from 'firebase/auth'
import { vi, beforeAll, beforeEach, describe, it, expect } from 'vitest'

import type { CurrentUser } from '@redwoodjs/auth'

import type { FirebaseClient } from '../firebase.js'
import { createAuth } from '../firebase.js'

const user: User = {
  uid: 'unique_user_id',
  displayName: 'John',
  email: 'john.doe@example.com',
  emailVerified: true,
  isAnonymous: false,
  metadata: {},
  providerData: [],
  refreshToken: '',
  tenantId: null,
  delete: async () => {},
  reload: async () => {},
  toJSON: () => ({}),
  phoneNumber: '',
  photoURL: '',
  providerId: '',
  getIdToken: async () => 'token',
  getIdTokenResult: async () => {
    return {
      claims: {
        roles: ['user'],
      },
      authTime: new Date().toUTCString(),
      expirationTime: new Date(Date.now() + 1000 * 3600).toUTCString(),
      issuedAtTime: new Date().toUTCString(),
      signInProvider: '',
      signInSecondFactor: null,
      token: 'token',
    }
  },
}

const adminUser: User = {
  uid: 'unique_user_id_admin',
  displayName: 'Mr Smith',
  email: 'admin@example.com',
  emailVerified: true,
  isAnonymous: false,
  metadata: {},
  providerData: [],
  refreshToken: '',
  tenantId: null,
  delete: async () => {},
  reload: async () => {},
  toJSON: () => ({}),
  phoneNumber: '',
  photoURL: '',
  providerId: '',
  getIdToken: async () => 'token',
  getIdTokenResult: async () => {
    return {
      claims: {
        roles: ['user', 'admin'],
      },
      authTime: new Date().toUTCString(),
      expirationTime: new Date(Date.now() + 1000 * 3600).toUTCString(),
      issuedAtTime: new Date().toUTCString(),
      signInProvider: '',
      signInSecondFactor: null,
      token: 'token',
    }
  },
}

let loggedInUser: User | undefined

const firebaseAuth: Partial<typeof FirebaseAuthNamespace> = {
  getAuth: () => {
    const auth: Partial<Auth> = {
      onAuthStateChanged: () => {
        return () => {}
      },
      signOut: async () => {
        loggedInUser = undefined
      },
      get currentUser() {
        return loggedInUser
      },
    }

    return auth as Auth
  },
  OAuthProvider: function () {} as unknown as typeof OAuthProvider,
  isSignInWithEmailLink: () => {
    return false
  },
  signInWithEmailAndPassword: async (
    _auth: Auth,
    email: string,
    _password: string,
  ) => {
    if (email.startsWith('admin')) {
      loggedInUser = adminUser
    } else {
      loggedInUser = user
    }

    return {
      user: loggedInUser,
      providerId: '',
      operationType: OperationType.SIGN_IN,
    }
  },
}

const firebaseMockClient: FirebaseClient = {
  firebaseAuth: firebaseAuth as typeof FirebaseAuthNamespace,
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

function getFirebaseAuth(customProviderHooks?: {
  useCurrentUser?: () => Promise<CurrentUser>
  useHasRole?: (
    currentUser: CurrentUser | null,
  ) => (rolesToCheck: string | string[]) => boolean
}) {
  const { useAuth, AuthProvider } = createAuth(
    firebaseMockClient,
    customProviderHooks,
  )
  const { result } = renderHook(() => useAuth(), {
    wrapper: AuthProvider,
  })

  return result
}

describe('firebaseAuth', () => {
  it('is not authenticated before logging in', async () => {
    const authRef = getFirebaseAuth()

    await act(async () => {
      expect(authRef.current.isAuthenticated).toBeFalsy()
    })
  })

  it('is authenticated after logging in', async () => {
    const authRef = getFirebaseAuth()

    await act(async () => {
      authRef.current.logIn({
        email: 'john.doe@example.com',
        password: 'open-sesame',
      })
    })

    expect(authRef.current.isAuthenticated).toBeTruthy()
  })

  it('is not authenticated after logging out', async () => {
    const authRef = getFirebaseAuth()

    await act(async () => {
      authRef.current.logIn({
        email: 'john.doe@example.com',
        password: 'open-sesame',
      })
    })

    expect(authRef.current.isAuthenticated).toBeTruthy()

    await act(async () => {
      authRef.current.logOut()
    })

    expect(authRef.current.isAuthenticated).toBeFalsy()
  })

  // firebase doesn't support roles using RW's default implementation right now
  it.skip('has role "user"', async () => {
    const authRef = getFirebaseAuth()

    expect(authRef.current.hasRole('user')).toBeFalsy()

    await act(async () => {
      authRef.current.logIn({
        email: 'john.doe@example.com',
        password: 'open-sesame',
      })
    })

    expect(authRef.current.hasRole('user')).toBeTruthy()
  })

  // firebase doesn't support roles using RW's default implementation right now
  it.skip('has role "admin"', async () => {
    const authRef = getFirebaseAuth()

    expect(authRef.current.hasRole('admin')).toBeFalsy()

    await act(async () => {
      authRef.current.logIn({
        email: 'admin@example.com',
        password: 'open-sesame',
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

    const authRef = getFirebaseAuth({ useHasRole })

    expect(authRef.current.hasRole('user')).toBeFalsy()

    await act(async () => {
      authRef.current.logIn({
        email: 'john.doe@example.com',
        password: 'open-sesame',
      })
    })

    expect(authRef.current.hasRole('user')).toBeTruthy()
    expect(authRef.current.hasRole('admin')).toBeFalsy()

    await act(async () => {
      authRef.current.logIn({
        email: 'admin@example.com',
        password: 'open-sesame',
      })
    })

    expect(authRef.current.hasRole('user')).toBeTruthy()
    expect(authRef.current.hasRole('admin')).toBeTruthy()
  })

  it('can specify custom getCurrentUser function', async () => {
    async function useCurrentUser() {
      const user = {
        ...loggedInUser,
        // Because we're writing our own custom getCurrentUser function we
        // can set roles where RW looks for them by default
        roles: ['custom-current-user'],
      }

      user.getIdTokenResult = async () => {
        return {
          claims: {
            roles: ['custom-current-user'],
          },
          authTime: new Date().toUTCString(),
          expirationTime: new Date(Date.now() + 1000 * 3600).toUTCString(),
          issuedAtTime: new Date().toUTCString(),
          signInProvider: '',
          signInSecondFactor: null,
          token: 'token',
        }
      }

      return user
    }

    const authRef = getFirebaseAuth({ useCurrentUser })

    // Need to be logged in, otherwise getCurrentUser won't be invoked
    await act(async () => {
      authRef.current.logIn({
        email: 'john.doe@example.com',
        password: 'open-sesame',
      })
    })

    await act(async () => {
      expect(authRef.current.hasRole('user')).toBeFalsy()
      expect(authRef.current.hasRole('custom-current-user')).toBeTruthy()
    })
  })
})
