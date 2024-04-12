import { renderHook, act } from '@testing-library/react'

import type { CurrentUser } from '@redwoodjs/auth'

import type { DbAuthClientArgs } from '../dbAuth'
import { createDbAuthClient, createAuth } from '../dbAuth'

globalThis.RWJS_API_URL = '/.redwood/functions'
globalThis.RWJS_API_GRAPHQL_URL = '/.redwood/functions/graphql'

jest.mock('@whatwg-node/fetch', () => {
  return
})

interface User {
  username: string
  email: string
  roles?: string[]
}

let loggedInUser: User | undefined

const fetchMock = jest.fn()
fetchMock.mockImplementation(async (url, options) => {
  const body = options?.body ? JSON.parse(options.body) : {}

  if (url?.includes('method=getToken')) {
    return {
      ok: true,
      text: () => (loggedInUser ? 'token' : ''),
      json: () => ({}),
    }
  }

  if (body.method === 'login') {
    loggedInUser = {
      username: body.username,
      roles: ['user'],
      email: body.username,
    }

    return {
      ok: true,
      text: () => '',
      json: () => loggedInUser,
    }
  }

  if (body.method === 'logout') {
    loggedInUser = undefined

    return {
      ok: true,
      text: () => '',
      json: () => ({}),
    }
  }

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
              username: 'user@middleware.auth',
              id: 'middleware-user-1',
            },
          },
        },
      }),
    }
  }

  if (url.includes('/middleware/dbauth/currentUser')) {
    return {
      ok: true,
      text: () => '',
      json: () => ({
        currentUser: loggedInUser,
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
  loggedInUser = undefined
})

const defaultArgs: DbAuthClientArgs & {
  useCurrentUser?: () => Promise<CurrentUser>
  useHasRole?: (
    currentUser: CurrentUser | null,
  ) => (rolesToCheck: string | string[]) => boolean
} = {
  fetchConfig: { credentials: 'include' },
}

function getDbAuth(args = defaultArgs) {
  const dbAuthClient = createDbAuthClient(args)
  const { useAuth, AuthProvider } = createAuth(dbAuthClient, {
    useHasRole: args.useHasRole,
    useCurrentUser: args.useCurrentUser,
  })
  const { result } = renderHook(() => useAuth(), {
    wrapper: AuthProvider,
  })

  return result
}

describe('dbAuth web ~ token auth edition', () => {
  it('sets a default credentials value if not included', async () => {
    const authRef = getDbAuth({ fetchConfig: {} })

    // act is okay here
    // https://egghead.io/lessons/jest-fix-the-not-wrapped-in-act-warning-when-testing-custom-hooks
    // plus, we're note rendering anything, so there is nothing to use
    // `screen.getByText()` etc with to wait for
    await act(async () => {
      await authRef.current.getToken()
    })

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${globalThis.RWJS_API_URL}/auth?method=getToken`,
      {
        credentials: 'same-origin',
      },
    )
  })

  it('passes through fetchOptions to forgotPassword calls', async () => {
    const auth = getDbAuth().current

    await act(async () => await auth.forgotPassword('username'))

    expect(fetchMock).toHaveBeenCalledWith(
      `${globalThis.RWJS_API_URL}/auth`,
      expect.objectContaining({
        credentials: 'include',
      }),
    )
  })

  it('passes through fetchOptions to getToken calls', async () => {
    const auth = getDbAuth().current

    await act(async () => {
      await auth.getToken()
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)

    expect(fetchMock).toHaveBeenCalledWith(
      `${globalThis.RWJS_API_URL}/auth?method=getToken`,
      {
        credentials: 'include',
      },
    )
  })

  it('passes through fetchOptions to login calls', async () => {
    const auth = (await getDbAuth()).current

    await act(
      async () =>
        await auth.logIn({ username: 'username', password: 'password' }),
    )

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${globalThis.RWJS_API_URL}/auth`,
      expect.objectContaining({
        credentials: 'include',
      }),
    )

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${globalThis.RWJS_API_URL}/auth`,
      expect.objectContaining({
        credentials: 'include',
      }),
    )
  })

  it('passes through fetchOptions to logout calls', async () => {
    const auth = getDbAuth().current
    await act(async () => {
      await auth.logOut()
    })

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${globalThis.RWJS_API_URL}/auth`,
      expect.objectContaining({
        credentials: 'include',
      }),
    )
  })

  it('passes through fetchOptions to resetPassword calls', async () => {
    const auth = getDbAuth().current
    await act(
      async () =>
        await auth.resetPassword({
          resetToken: 'reset-token',
          password: 'password',
        }),
    )

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${globalThis.RWJS_API_URL}/auth`,
      expect.objectContaining({
        credentials: 'include',
      }),
    )
  })

  it('passes through fetchOptions to signup calls', async () => {
    const auth = getDbAuth().current
    await act(
      async () =>
        await auth.signUp({
          username: 'username',
          password: 'password',
        }),
    )

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${globalThis.RWJS_API_URL}/auth`,
      expect.objectContaining({
        credentials: 'include',
      }),
    )
  })

  it('passes through fetchOptions to validateResetToken calls', async () => {
    const auth = getDbAuth().current
    await act(async () => await auth.validateResetToken('token'))

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${globalThis.RWJS_API_URL}/auth`,
      expect.objectContaining({
        credentials: 'include',
      }),
    )
  })

  it('allows you to configure the api side url', async () => {
    const auth = getDbAuth({ dbAuthUrl: '/.redwood/functions/dbauth' }).current

    await act(async () => await auth.forgotPassword('username'))

    expect(fetchMock).toHaveBeenCalledWith(
      '/.redwood/functions/dbauth',
      expect.objectContaining({
        credentials: 'same-origin',
      }),
    )
  })

  it('is not authenticated before logging in', async () => {
    const auth = getDbAuth().current

    await act(async () => {
      expect(auth.isAuthenticated).toBeFalsy()
    })
  })

  it('is authenticated after logging in', async () => {
    const authRef = getDbAuth()

    await act(async () => {
      authRef.current.logIn({
        username: 'auth-test',
        password: 'ThereIsNoSpoon',
      })
    })

    expect(authRef.current.isAuthenticated).toBeTruthy()
  })

  it('is not authenticated after logging out', async () => {
    const authRef = getDbAuth()

    await act(async () => {
      authRef.current.logIn({
        username: 'auth-test',
        password: 'ThereIsNoSpoon',
      })
    })

    expect(authRef.current.isAuthenticated).toBeTruthy()

    await act(async () => {
      authRef.current.logOut()
    })

    expect(authRef.current.isAuthenticated).toBeFalsy()
  })

  it('does not affect logged in/out status when using forgotPassword', async () => {
    const authRef = getDbAuth()

    await act(async () => {
      authRef.current.logIn({
        username: 'auth-test',
        password: 'ThereIsNoSpoon',
      })
    })

    expect(authRef.current.isAuthenticated).toBeTruthy()

    await act(async () => {
      authRef.current.forgotPassword('auth-test')
    })

    expect(authRef.current.isAuthenticated).toBeTruthy()

    await act(async () => {
      authRef.current.logOut()
    })

    expect(authRef.current.isAuthenticated).toBeFalsy()

    await act(async () => {
      authRef.current.forgotPassword('auth-test')
    })

    expect(authRef.current.isAuthenticated).toBeFalsy()
  })

  it('has role "user"', async () => {
    const authRef = getDbAuth()

    expect(authRef.current.hasRole('user')).toBeFalsy()

    await act(async () => {
      authRef.current.logIn({
        username: 'auth-test',
        password: 'ThereIsNoSpoon',
      })
    })

    expect(authRef.current.hasRole('user')).toBeTruthy()
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

    const authRef = getDbAuth({ useHasRole })

    expect(authRef.current.hasRole('user')).toBeFalsy()

    await act(async () => {
      authRef.current.logIn({
        username: 'auth-test@example.com',
        password: 'ThereIsNoSpoon',
      })
    })

    expect(authRef.current.hasRole('user')).toBeTruthy()
    expect(authRef.current.hasRole('admin')).toBeFalsy()

    await act(async () => {
      authRef.current.logIn({
        username: 'admin@example.com',
        password: 'ThereIsNoSpoon',
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

    const authRef = getDbAuth({ useCurrentUser })

    // Need to be logged in, otherwise getCurrentUser won't be invoked
    await act(async () => {
      authRef.current.logIn({
        username: 'auth-test@example.com',
        password: 'ThereIsNoSpoon',
      })
    })

    await act(async () => {
      expect(authRef.current.hasRole('user')).toBeFalsy()
      expect(authRef.current.hasRole('custom-current-user')).toBeTruthy()
    })
  })
})

describe('dbAuth web ~ cookie/middleware auth edition', () => {
  beforeEach(() => {
    fetchMock.mockClear()
  })

  it('will create a middleware version of the auth client', async () => {
    const { current: dbAuthInstance } = getDbAuth({
      middleware: true,
    })

    // Middleware auth clients should not return tokens
    expect(await dbAuthInstance.getToken()).toBeNull()

    let currentUser
    await act(async () => {
      currentUser = await dbAuthInstance.getCurrentUser()
    })

    expect(globalThis.fetch).toHaveBeenCalledWith(
      // Doesn't speak to graphql!
      '/middleware/dbauth/currentUser',
      expect.objectContaining({
        credentials: 'include',
        method: 'GET', // in mw auth, we use GET for currentUser
      }),
    )

    expect(currentUser).toEqual({
      id: 'middleware-user-1',
      username: 'user@middleware.auth',
    })
  })

  it('allows you to override the middleware endpoint', async () => {
    const auth = getDbAuth({
      dbAuthUrl: '/hello/handsome',
      middleware: true,
    }).current

    await act(async () => await auth.forgotPassword('username'))

    expect(fetchMock).toHaveBeenCalledWith(
      '/hello/handsome',
      expect.any(Object),
    )
  })

  it('calls login at the middleware endpoint', async () => {
    const auth = (
      await getDbAuth({
        middleware: true,
      })
    ).current

    await act(
      async () =>
        await auth.logIn({ username: 'username', password: 'password' }),
    )

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/middleware/dbauth',
      expect.any(Object),
    )
  })

  it('calls middleware endpoint for logout', async () => {
    const auth = getDbAuth({
      middleware: true,
    }).current
    await act(async () => {
      await auth.logOut()
    })

    expect(globalThis.fetch).toHaveBeenCalledWith('/middleware/dbauth', {
      body: '{"method":"logout"}',
      credentials: 'same-origin',
      method: 'POST',
    })
  })

  it('calls reset password at the correct endpoint', async () => {
    const auth = getDbAuth({
      middleware: true,
    }).current

    await act(
      async () =>
        await auth.resetPassword({
          resetToken: 'reset-token',
          password: 'password',
        }),
    )

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/middleware/dbauth',
      expect.objectContaining({
        body: '{"resetToken":"reset-token","password":"password","method":"resetPassword"}',
      }),
    )
  })

  it('passes through fetchOptions to signup calls', async () => {
    const auth = getDbAuth({
      middleware: true,
    }).current

    await act(
      async () =>
        await auth.signUp({
          username: 'username',
          password: 'password',
        }),
    )

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/middleware/dbauth',
      expect.objectContaining({
        method: 'POST',
        body: '{"username":"username","password":"password","method":"signup"}',
      }),
    )
  })
})
