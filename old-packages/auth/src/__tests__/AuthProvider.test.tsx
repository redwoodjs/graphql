import React, { useEffect, useState } from 'react'

import {
  act,
  render,
  renderHook,
  screen,
  fireEvent,
  waitFor,
  configure,
} from '@testing-library/react'
import { graphql } from 'msw'
import { setupServer } from 'msw/node'
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest'
import {
  fetch as fetchPolyfill,
  Headers as HeadersPolyfill,
  Request as RequestPolyfill,
  Response as ResponsePolyfill,
} from 'whatwg-fetch'

globalThis.fetch = fetchPolyfill
globalThis.Headers = HeadersPolyfill
globalThis.Request = RequestPolyfill
globalThis.Response = ResponsePolyfill

import type { CustomTestAuthClient } from './fixtures/customTestAuth.js'
import { createCustomTestAuth } from './fixtures/customTestAuth.js'

configure({
  asyncUtilTimeout: 5_000,
})

let CURRENT_USER_DATA: {
  name: string
  email: string
  roles?: string | string[]
} = {
  name: 'Peter Pistorius',
  email: 'nospam@example.net',
}

globalThis.RWJS_API_GRAPHQL_URL = '/.netlify/functions/graphql'

let mockedIsAuthenticatedStatus = false
const server = setupServer(
  graphql.query('__REDWOOD__AUTH_GET_CURRENT_USER', (_req, res, ctx) => {
    if (!mockedIsAuthenticatedStatus) {
      return res(ctx.status(500))
    }

    return res(
      ctx.data({
        redwood: {
          currentUser: CURRENT_USER_DATA,
        },
      }),
    )
  }),
)

const consoleError = console.error

const mockedTestAuthClient = {
  login: () => true,
  signup: () => {},
  logout: () => {},
  getToken: vi.fn(),
  getUserMetadata: vi.fn(),
  forgotPassword: () => {},
  resetPassword: () => true,
  validateResetToken: () => ({}),
} satisfies CustomTestAuthClient

async function getCustomTestAuth() {
  const { AuthProvider, useAuth } = createCustomTestAuth(mockedTestAuthClient)
  const { result } = renderHook(() => useAuth(), {
    wrapper: AuthProvider,
  })

  return result.current
}

beforeAll(() => {
  server.listen()
  console.error = () => {}
})

beforeEach(() => {
  mockedIsAuthenticatedStatus = false

  server.resetHandlers()
  CURRENT_USER_DATA = {
    name: 'Peter Pistorius',
    email: 'nospam@example.net',
  }
  vi.resetAllMocks()
})

afterAll(() => {
  server.close()
  console.error = consoleError
})

describe('Custom auth provider', () => {
  const { AuthProvider, useAuth } = createCustomTestAuth(mockedTestAuthClient)

  const AuthConsumer = () => {
    const {
      loading,
      isAuthenticated,
      logOut,
      logIn,
      getToken,
      userMetadata,
      currentUser,
      reauthenticate,
      hasError,
      hasRole,
      error,
    } = useAuth()

    const [authToken, setAuthToken] = useState<string | null>(null)

    useEffect(() => {
      const retrieveToken = async () => {
        const token = await getToken()
        setAuthToken(token)
      }
      retrieveToken()
    }, [isAuthenticated, getToken])

    if (loading) {
      return <>Loading...</>
    }

    if (hasError) {
      return <>{error?.message}</>
    }

    return (
      <>
        <button
          onClick={() => {
            if (isAuthenticated) {
              logOut()
            } else {
              logIn()
            }
          }}
        >
          {isAuthenticated ? 'Log Out' : 'Log In'}
        </button>

        {isAuthenticated && (
          <>
            <p>userMetadata: {JSON.stringify(userMetadata)}</p>
            <p>authToken: {authToken}</p>
            <p>
              currentUser:{' '}
              {(currentUser && JSON.stringify(currentUser)) ||
                'no current user data'}
            </p>
            <p>Has Admin: {hasRole('admin') ? 'yes' : 'no'}</p>
            <p>Has Super User: {hasRole('superuser') ? 'yes' : 'no'}</p>
            <p>Has Admin as Array: {hasRole(['admin']) ? 'yes' : 'no'}</p>
            <p>Has Editor: {hasRole(['editor', 'publisher']) ? 'yes' : 'no'}</p>
            <p>
              Has Editor or Author:{' '}
              {hasRole(['editor', 'author']) ? 'yes' : 'no'}
            </p>

            <button onClick={() => reauthenticate()}>Update auth data</button>
          </>
        )}
      </>
    )
  }

  /**
   * A logged out user can login, view their personal account information and logout.
   */
  test('Authentication flow (logged out -> login -> logged in -> logout) works as expected', async () => {
    mockedTestAuthClient.getToken.mockReturnValue(null)

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    )

    // We're booting up!
    expect(screen.getByText('Loading...')).toBeInTheDocument()

    // The user is not authenticated
    await waitFor(() => screen.getByText('Log In'))

    // Override the mocked login status, so getCurrentUser msw mock returns a user
    pretendWeLoggedIn()

    fireEvent.click(screen.getByText('Log In'))

    // We wait for the token, because it's updated by the useEffect
    // if we just wait for "Log Out" button, tests sometimes fail on windows
    await waitFor(() => screen.getByText('authToken: hunter2'))
    expect(mockedTestAuthClient.getUserMetadata).toBeCalledTimes(1)
    expect(mockedTestAuthClient.getToken).toHaveBeenCalled()
    expect(mockedTestAuthClient.getToken()).toEqual('hunter2')

    expect(
      screen.getByText(
        'userMetadata: {"sub":"abcdefg|123456","username":"peterp"}',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'currentUser: {"name":"Peter Pistorius","email":"nospam@example.net"}',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Log Out')).toBeInTheDocument()

    // Log out
    fireEvent.click(screen.getByText('Log Out'))
    await waitFor(() => screen.getByText('Log In'))
  })

  /**
   * This is especially helpful if you want to update the currentUser state.
   */
  test('A user can be re-authenticated to update the "auth state"', async () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    )

    // The user is not authenticated
    await waitFor(() => screen.getByText('Log In'))

    pretendWeLoggedIn()

    fireEvent.click(screen.getByText('Log In'))

    // Check that you're logged in!
    await waitFor(() => screen.getByText('Log Out'))
    expect(mockedTestAuthClient.getUserMetadata).toBeCalledTimes(1)

    // The original current user data is fetched.
    expect(
      screen.getByText(
        'currentUser: {"name":"Peter Pistorius","email":"nospam@example.net"}',
      ),
    ).toBeInTheDocument()

    CURRENT_USER_DATA = { ...CURRENT_USER_DATA, name: 'Rambo' }
    fireEvent.click(screen.getByText('Update auth data'))

    await waitFor(() =>
      screen.getByText(
        'currentUser: {"name":"Rambo","email":"nospam@example.net"}',
      ),
    )
  })

  /**
   * Check assigned role access
   */
  test('Authenticated user has assigned role access as expected', async () => {
    CURRENT_USER_DATA = {
      name: 'Peter Pistorius',
      email: 'nospam@example.net',
      roles: ['janitor'],
    }

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    )

    // We're booting up!
    expect(screen.getByText('Loading...')).toBeInTheDocument()

    // The user is not authenticated
    await waitFor(() => screen.getByText('Log In'))

    expect(screen.queryByText('Has Admin:')).not.toBeInTheDocument()
    expect(screen.queryByText('Has Super User:')).not.toBeInTheDocument()

    pretendWeLoggedIn()
    fireEvent.click(screen.getByText('Log In'))

    // Check that you're logged in!
    await waitFor(() => screen.getByText('Log Out'))

    expect(screen.getByText('Has Admin: no')).toBeInTheDocument()
    expect(screen.getByText('Has Super User: no')).toBeInTheDocument()

    // Log out
    fireEvent.click(screen.getByText('Log Out'))
    await waitFor(() => screen.getByText('Log In'))
  })

  /**
   * Check unassigned role access
   */
  test('Authenticated user has not been assigned role access as expected', async () => {
    CURRENT_USER_DATA = {
      name: 'Peter Pistorius',
      email: 'nospam@example.net',
      roles: ['admin', 'superuser'],
    }

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    )

    // We're booting up!
    expect(screen.getByText('Loading...')).toBeInTheDocument()

    // The user is not authenticated
    await waitFor(() => screen.getByText('Log In'))

    expect(screen.queryByText('Has Admin:')).not.toBeInTheDocument()
    expect(screen.queryByText('Has Super User:')).not.toBeInTheDocument()

    pretendWeLoggedIn()
    fireEvent.click(screen.getByText('Log In'))

    // Check that you're logged in!
    await waitFor(() => screen.getByText('Log Out'))

    expect(screen.getByText('Has Admin: yes')).toBeInTheDocument()
    expect(screen.getByText('Has Super User: yes')).toBeInTheDocument()

    // Log out
    fireEvent.click(screen.getByText('Log Out'))
    await waitFor(() => screen.getByText('Log In'))
  })

  /**
   * Check some unassigned role access
   */
  test('Authenticated user has not been assigned some role access but not others as expected', async () => {
    CURRENT_USER_DATA = {
      name: 'Peter Pistorius',
      email: 'nospam@example.net',
      roles: ['admin'],
    }

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    )

    // We're booting up!
    expect(screen.getByText('Loading...')).toBeInTheDocument()

    // The user is not authenticated
    await waitFor(() => screen.getByText('Log In'))

    expect(screen.queryByText('Has Admin:')).not.toBeInTheDocument()
    expect(screen.queryByText('Has Super User:')).not.toBeInTheDocument()

    pretendWeLoggedIn()
    fireEvent.click(screen.getByText('Log In'))

    // Check that you're logged in!
    await waitFor(() => screen.getByText('Log Out'))

    expect(screen.getByText('Has Admin: yes')).toBeInTheDocument()
    expect(screen.getByText('Has Super User: no')).toBeInTheDocument()

    // Log out
    fireEvent.click(screen.getByText('Log Out'))
    await waitFor(() => screen.getByText('Log In'))
  })

  /**
   * Check assigned role access when specified as single array element
   */
  test('Authenticated user has assigned role access as expected', async () => {
    CURRENT_USER_DATA = {
      name: 'Peter Pistorius',
      email: 'nospam@example.net',
      roles: ['admin'],
    }

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    )

    // We're booting up!
    expect(screen.getByText('Loading...')).toBeInTheDocument()

    // The user is not authenticated
    await waitFor(() => screen.getByText('Log In'))

    expect(screen.queryByText('Has Admin:')).not.toBeInTheDocument()
    expect(screen.queryByText('Has Super User:')).not.toBeInTheDocument()

    pretendWeLoggedIn()
    fireEvent.click(screen.getByText('Log In'))

    // Check that you're logged in!
    await waitFor(() => screen.getByText('Log Out'))

    expect(screen.getByText('Has Admin as Array: yes')).toBeInTheDocument()

    // Log out
    fireEvent.click(screen.getByText('Log Out'))
    await waitFor(() => screen.getByText('Log In'))
  })

  /**
   * Check assigned role access when specified as array element
   */
  test('Authenticated user has assigned role access as expected', async () => {
    CURRENT_USER_DATA = {
      name: 'Peter Pistorius',
      email: 'nospam@example.net',
      roles: ['admin'],
    }

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    )

    // We're booting up!
    expect(screen.getByText('Loading...')).toBeInTheDocument()

    // The user is not authenticated
    await waitFor(() => screen.getByText('Log In'))

    expect(screen.queryByText('Has Admin:')).not.toBeInTheDocument()
    expect(screen.queryByText('Has Super User:')).not.toBeInTheDocument()

    pretendWeLoggedIn()
    fireEvent.click(screen.getByText('Log In'))

    // Check that you're logged in!
    await waitFor(() => screen.getByText('Log Out'))

    expect(screen.getByText('Has Admin as Array: yes')).toBeInTheDocument()

    // Log out
    fireEvent.click(screen.getByText('Log Out'))
    await waitFor(() => screen.getByText('Log In'))
  })

  test('Checks roles successfully when roles in currentUser is a string', async () => {
    CURRENT_USER_DATA = {
      name: 'Peter Pistorius',
      email: 'nospam@example.net',
      roles: 'admin',
    }

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    )

    // We're booting up!
    expect(screen.getByText('Loading...')).toBeInTheDocument()

    // The user is not authenticated
    await waitFor(() => screen.getByText('Log In'))

    expect(screen.queryByText('Has Admin:')).not.toBeInTheDocument()
    expect(screen.queryByText('Has Super User:')).not.toBeInTheDocument()

    pretendWeLoggedIn()
    fireEvent.click(screen.getByText('Log In'))

    // Check that you're logged in!
    await waitFor(() => screen.getByText('Log Out'))

    expect(screen.getByText('Has Admin: yes')).toBeInTheDocument()
    expect(screen.getByText('Has Admin as Array: yes')).toBeInTheDocument()

    // Log out
    fireEvent.click(screen.getByText('Log Out'))
    await waitFor(() => screen.getByText('Log In'))
  })

  /**
   * Check if assigned one of the roles in an array
   */
  test('Authenticated user has assigned role access as expected', async () => {
    CURRENT_USER_DATA = {
      name: 'Peter Pistorius',
      email: 'nospam@example.net',
      roles: ['editor'],
    }

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    )

    // We're booting up!
    expect(screen.getByText('Loading...')).toBeInTheDocument()

    // The user is not authenticated
    await waitFor(() => screen.getByText('Log In'))

    expect(screen.queryByText('Has Admin:')).not.toBeInTheDocument()
    expect(screen.queryByText('Has Super User:')).not.toBeInTheDocument()

    pretendWeLoggedIn()
    fireEvent.click(screen.getByText('Log In'))

    // Check that you're logged in!
    await waitFor(() => screen.getByText('Log Out'))

    expect(screen.getByText('Has Editor: yes')).toBeInTheDocument()

    // Log out
    fireEvent.click(screen.getByText('Log Out'))
    await waitFor(() => screen.getByText('Log In'))
  })

  /**
   * Check if not assigned any of the roles in an array
   */
  test('Authenticated user has assigned role access as expected', async () => {
    CURRENT_USER_DATA = {
      name: 'Peter Pistorius',
      email: 'nospam@example.net',
      roles: ['admin'],
    }

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    )

    // We're booting up!
    expect(screen.getByText('Loading...')).toBeInTheDocument()

    // The user is not authenticated
    await waitFor(() => screen.getByText('Log In'))

    expect(screen.queryByText('Has Admin:')).not.toBeInTheDocument()
    expect(screen.queryByText('Has Super User:')).not.toBeInTheDocument()

    pretendWeLoggedIn()
    fireEvent.click(screen.getByText('Log In'))

    // Check that you're logged in!
    await waitFor(() => screen.getByText('Log Out'))

    expect(screen.getByText('Has Admin: yes')).toBeInTheDocument()
    expect(screen.getByText('Has Editor: no')).toBeInTheDocument()
    expect(screen.getByText('Has Editor or Author: no')).toBeInTheDocument()

    // Log out
    fireEvent.click(screen.getByText('Log Out'))
    await waitFor(() => screen.getByText('Log In'))
  })

  test('proxies forgotPassword() calls to client', async () => {
    const mockedForgotPassword = vi.spyOn(
      mockedTestAuthClient,
      'forgotPassword',
    )

    // @ts-expect-error We're testing this
    mockedForgotPassword.mockImplementation((username: string) => {
      expect(username).toEqual('username')
    })

    const TestAuthConsumer = () => {
      const { loading, forgotPassword } = useAuth()

      useEffect(() => {
        if (!loading) {
          forgotPassword('username')
        }
      }, [loading, forgotPassword])

      return null
    }

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>,
    )

    await waitFor(() => expect(mockedForgotPassword).toBeCalledWith('username'))
  })

  test('proxies resetPassword() calls to client', async () => {
    // @ts-expect-error We're testing this
    mockedTestAuthClient.resetPassword = (password: string) => {
      expect(password).toEqual('password')

      return true
    }

    const auth = await getCustomTestAuth()

    // act is generally frowned upon in test cases. But it's okay here, see
    // https://egghead.io/lessons/jest-fix-the-not-wrapped-in-act-warning-when-testing-custom-hooks
    // plus, we're note rendering anything, so there is nothing to use
    // `screen.getByText()` etc with to wait for
    await act(async () => {
      await auth.resetPassword('password')
    })

    expect.assertions(1)
  })

  test('proxies validateResetToken() calls to client', async () => {
    // @ts-expect-error Test function, chill out
    mockedTestAuthClient.validateResetToken = (resetToken: string | null) => {
      expect(resetToken).toEqual('12345')

      return {}
    }

    const auth = await getCustomTestAuth()

    await act(async () => {
      await auth.validateResetToken('12345')
    })

    expect.assertions(1)
  })

  test("getToken doesn't fail if client throws an error", async () => {
    mockedTestAuthClient.getToken.mockImplementation(() => {
      throw new Error('Login Required')
    })
    const auth = await getCustomTestAuth()

    await act(async () => {
      await auth.getToken()
    })

    expect(mockedTestAuthClient.getToken).toThrow()

    // If we got here, the whole test did not throw even though getToken did
    expect.assertions(1)
  })
})

function pretendWeLoggedIn() {
  mockedIsAuthenticatedStatus = true
  mockedTestAuthClient.getToken.mockReturnValue('hunter2')
  mockedTestAuthClient.getUserMetadata.mockImplementation(() => {
    return mockedIsAuthenticatedStatus
      ? {
          sub: 'abcdefg|123456',
          username: 'peterp',
        }
      : null
  })
}
