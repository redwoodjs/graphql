import path from 'node:path'

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import {
  MiddlewareRequest as MWRequest,
  MiddlewareRequest,
  MiddlewareResponse,
} from '@redwoodjs/web/middleware'

import { middlewareDefaultAuthProviderState } from '../../../../../auth/dist/AuthProvider/AuthProviderState.js'
import type { DbAuthMiddlewareOptions } from '../index.js'
import { initDbAuthMiddleware } from '../index.js'

const FIXTURE_PATH = path.resolve(
  __dirname,
  '../../../../../../__fixtures__/example-todo-main',
)

beforeAll(() => {
  process.env.RWJS_CWD = FIXTURE_PATH

  // Mock the session decryption
  vi.mock('@redwoodjs/auth-dbauth-api', async (importOriginal) => {
    const original = (await importOriginal()) as any
    return {
      default: {
        ...original,
        dbAuthSession: vi.fn().mockImplementation((req, cookieName) => {
          if (
            req.headers
              .get('Cookie')
              .includes(`${cookieName}=this_is_the_only_correct_session`)
          ) {
            return {
              currentUser: {
                email: 'user-1@example.com',
                id: 'mocked-current-user-1',
              },
              mockedSession: 'this_is_the_only_correct_session',
            }
          }

          return undefined
        }),
      },
    }
  })
})

afterAll(() => {
  delete process.env.RWJS_CWD
})

describe('dbAuthMiddleware', () => {
  it('When no cookie headers, pass through the response', async () => {
    const options: DbAuthMiddlewareOptions = {
      cookieName: '8911',
      getCurrentUser: vi.fn(),
      dbAuthHandler: vi.fn(),
    }

    const [middleware] = initDbAuthMiddleware(options)
    const req = {
      method: 'GET',
      headers: new Headers(),
      url: 'http://localhost:8911',
    } as MiddlewareRequest

    const res = await middleware(req, { passthrough: true } as any)

    expect(res).toEqual({ passthrough: true })
  })

  it('decrypts and sets server auth context when it has a cookie header with session and auth-provider cookies', async () => {
    const cookieHeader =
      'session=this_is_the_only_correct_session;auth-provider=dbAuth'

    const options: DbAuthMiddlewareOptions = {
      getCurrentUser: vi.fn(async () => {
        return { id: 'mocked-current-user-1', email: 'user-1@example.com' }
      }),
      dbAuthHandler: vi.fn(),
      getRoles: vi.fn(() => ['f1driver']),
    }
    const [middleware] = initDbAuthMiddleware(options)

    const mwReq = new MiddlewareRequest(
      new Request('http://localhost:8911', {
        method: 'GET',
        headers: {
          Cookie: cookieHeader,
        },
      }),
    )

    const res = await middleware(mwReq, MiddlewareResponse.next())

    expect(mwReq.serverAuthState.get()).toEqual({
      cookieHeader,
      currentUser: {
        email: 'user-1@example.com',
        id: 'mocked-current-user-1',
      },
      hasError: false,
      isAuthenticated: true,
      loading: false,
      userMetadata: {
        email: 'user-1@example.com',
        id: 'mocked-current-user-1',
      },
      roles: ['f1driver'], // Because we override the getRoles function
    })

    expect(options.getRoles).toHaveBeenCalledWith({
      currentUser: {
        email: 'user-1@example.com',
        id: 'mocked-current-user-1',
      },
      mockedSession: 'this_is_the_only_correct_session',
    })

    // Allow react render, because body is not defined, and status code not redirect
    expect(res).toHaveProperty('body', undefined)
    expect(res).toHaveProperty('status', 200)
  })

  it('Will use the cookie name option correctly', async () => {
    const cookieHeader =
      'bazinga_8911=this_is_the_only_correct_session;auth-provider=dbAuth'

    const options: DbAuthMiddlewareOptions = {
      getCurrentUser: vi.fn(async () => {
        return { id: 'mocked-current-user-1', email: 'user-1@example.com' }
      }),
      dbAuthHandler: vi.fn(),
      cookieName: 'bazinga_%port%',
    }
    const [middleware] = initDbAuthMiddleware(options)

    const mwReq = new MiddlewareRequest(
      new Request('http://bazinga.new/kittens', {
        method: 'GET',
        headers: {
          Cookie: cookieHeader,
        },
      }),
    )

    const res = await middleware(mwReq, MiddlewareResponse.next())

    expect(mwReq.serverAuthState.get()).toEqual({
      cookieHeader,
      currentUser: {
        email: 'user-1@example.com',
        id: 'mocked-current-user-1',
      },
      hasError: false,
      isAuthenticated: true,
      loading: false,
      userMetadata: {
        email: 'user-1@example.com',
        id: 'mocked-current-user-1',
      },
      // No get roles function, so it should be empty
      roles: [],
    })

    // Allow react render, because body is not defined, and status code not redirect
    expect(res).toHaveProperty('body', undefined)
    expect(res).toHaveProperty('status', 200)
  })

  it('handles a currentUser request', async () => {
    const cookieHeader = 'session=this_is_the_only_correct_session'
    const request = new Request(
      'http://localhost:8910/middleware/dbauth/currentUser',
      {
        method: 'GET',
        headers: {
          Cookie: cookieHeader,
        },
      },
    )

    const req = new MWRequest(request)
    const cookie = req.headers.get('Cookie')

    expect(cookie).toBe(cookieHeader)

    const currentUser = { user: { id: 100, email: 'currentUser@example.com' } }

    const options: DbAuthMiddlewareOptions = {
      getCurrentUser: async () => {
        return currentUser
      },
      dbAuthHandler: vi.fn(),
    }
    const [middleware] = initDbAuthMiddleware(options)

    const res = await middleware(req, MiddlewareResponse.next())

    expect(res).toBeDefined()
    expect(res?.body).toBe(JSON.stringify({ currentUser }))
  })

  describe('handle all supported dbAuth verbs (aka methods) and their HTTP methods', async () => {
    /**
     * Supported verbs and their corresponding HTTP methods:
     *
     * login: 'POST',
     * logout: 'POST',
     * resetPassword: 'POST',
     * signup: 'POST',
     * forgotPassword: 'POST',
     * getToken: 'GET',
     * validateResetToken: 'POST',
     * webAuthnRegOptions: 'GET',
     * webAuthnRegister: 'POST',
     * webAuthnAuthOptions: 'GET',
     * webAuthnAuthenticate: 'POST',
     */

    it('handles a login request', async () => {
      const user = { id: 2, email: 'user-login@example.com' }
      const request = new Request(
        'http://localhost:8911/middleware/dbauth/auth?method=login',
        {
          method: 'POST',
          body: JSON.stringify({ username: user.email, password: 'password' }),
        },
      )

      const req = new MWRequest(request)

      const options: DbAuthMiddlewareOptions = {
        cookieName: 'session_8911',
        getCurrentUser: async () => {
          return {}
        },
        dbAuthHandler: vi.fn(async () => {
          return {
            body: JSON.stringify(user),
            headers: {
              Cookie:
                'session=cookie-value; Path=/; HttpOnly; SameSite=Lax; Secure',
            },
            statusCode: 200,
          }
        }),
      }
      const [middleware] = initDbAuthMiddleware(options)

      const res = await middleware(req, MiddlewareResponse.next())

      // Forwards the request on
      expect(options.dbAuthHandler).toHaveBeenCalledWith(req)

      expect(res).toBeDefined()
      expect(res).toHaveProperty('body', JSON.stringify(user))
      expect(res).toHaveProperty('status', 200)
    })

    it('handles a logout request', async () => {
      const request = new Request(
        'http://localhost:8911/middleware/dbauth/auth?method=logout',
        {
          method: 'POST',
        },
      )

      const req = new MWRequest(request)

      const options: DbAuthMiddlewareOptions = {
        cookieName: 'session_8911',
        getCurrentUser: async () => {
          return {}
        },
        dbAuthHandler: async () => {
          return {
            body: '',
            headers: {
              'set-cookie':
                'session=cookie-value; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; HttpOnly; SameSite=Lax; Secure',
            },
            statusCode: 200,
          }
        },
      }
      const [middleware] = initDbAuthMiddleware(options)

      const res = await middleware(req, MiddlewareResponse.next())

      expect(res).toBeDefined()
      expect(res).toHaveProperty('body', '')
      expect(res).toHaveProperty('status', 200)
      expect(res?.headers.getSetCookie()).toContain(
        'session=cookie-value; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; HttpOnly; SameSite=Lax; Secure',
      )
    })

    it('handles a signup request', async () => {
      const user = {
        id: 2,
        email: 'user-signup@example.com',
        name: 'user-signup',
      }
      const request = new Request(
        'http://localhost:8911/middleware/dbauth/auth?method=signUp',
        {
          method: 'POST',
          body: JSON.stringify({
            username: user.email,
            name: user.name,
            password: 'password',
          }),
          headers: {},
        },
      )

      const req = new MWRequest(request)

      const options: DbAuthMiddlewareOptions = {
        cookieName: 'session_8911',
        getCurrentUser: async () => {
          return {}
        },
        dbAuthHandler: async () => {
          return {
            body: JSON.stringify({
              user: {
                id: user.id,
                email: user.email,
                name: user.name,
              },
            }),
            headers: {
              'set-cookie': 'session_8911=some-encrypted-cookie',
            },
            statusCode: 200,
          }
        },
      }
      const [middleware] = initDbAuthMiddleware(options)

      const res = await middleware(req, MiddlewareResponse.next())

      expect(res).toBeDefined()
      expect(res).toHaveProperty(
        'body',
        JSON.stringify({
          user: { id: user.id, email: user.email, name: user.name },
        }),
      )

      expect(res).toHaveProperty('status', 200)
      expect(res?.headers.getSetCookie()).toContain(
        'session_8911=some-encrypted-cookie',
      )
    })

    it('handles a forgotPassword request', async () => {
      const resetToken = JSON.stringify({ resetToken: 'reset-token' })
      const request = new Request(
        'http://localhost:8911/middleware/dbauth/auth?method=forgotPassword',
        {
          method: 'POST',
          body: JSON.stringify({ username: 'forgotten@example.com' }),
        },
      )

      const req = new MWRequest(request)

      const options: DbAuthMiddlewareOptions = {
        cookieName: 'session_8911',
        getCurrentUser: async () => {
          return {}
        },
        dbAuthHandler: async () => {
          return {
            body: resetToken,
            headers: {},
            statusCode: 200,
          }
        },
      }
      const [middleware] = initDbAuthMiddleware(options)

      const res = await middleware(req, MiddlewareResponse.next())
      expect(res?.body).toEqual(resetToken)
    })

    it('handles a getToken request', async () => {
      const cookieHeader =
        'session=ko6iXKV11DSjb6kFJ4iwcf1FEqa5wPpbL1sdtKiV51Y=|cQaYkOPG/r3ILxWiFiz90w=='

      const request = new Request(
        'http://localhost:8911/middleware/dbauth/auth?method=getToken',
        {
          method: 'GET',
          headers: {
            Cookie: cookieHeader,
          },
        },
      )

      const req = new MWRequest(request)

      const options: DbAuthMiddlewareOptions = {
        getCurrentUser: async () => {
          return { user: { id: 100, email: 'tolkienUser@example.com' } }
        },
        dbAuthHandler: async () => {
          return {
            body: 'getTokenResponse',
            headers: {},
            statusCode: 200,
          }
        },
      }
      const [middleware] = initDbAuthMiddleware(options)

      const res = await middleware(req, MiddlewareResponse.next())
      expect(res).toBeDefined()
      expect(res?.body).toBe('getTokenResponse')
    })

    it('handles a validateResetToken request', async () => {
      const request = new Request(
        'http://localhost:8911/middleware/dbauth/auth?method=validateResetToken',
        {
          method: 'POST',
          body: JSON.stringify({ resetToken: 'some-reset-token' }),
        },
      )

      const req = new MWRequest(request)

      const options: DbAuthMiddlewareOptions = {
        cookieName: 'session_8911',
        getCurrentUser: async () => {
          return {}
        },
        dbAuthHandler: async () => {
          return {
            body: JSON.stringify({
              user: { id: 100, email: 'reset@example.com' },
            }),
            headers: {},
            statusCode: 200,
          }
        },
      }
      const [middleware] = initDbAuthMiddleware(options)

      const res = await middleware(req, MiddlewareResponse.next())
      expect(res).toBeDefined()
      expect(res?.body).toBe(
        JSON.stringify({ user: { id: 100, email: 'reset@example.com' } }),
      )

      const serverAuthState = req.serverAuthState.get()
      expect(serverAuthState.isAuthenticated).toBe(false)
    })

    it('handles a webAuthnRegOptions request', async () => {
      const regOptionsBody = JSON.stringify({
        r: { id: 1 },
        user: { user: { id: 100, email: 'user@example.com' } },
        challenge: 'challenge',
        pubKeyCredParam: '',
        timeout: 100,
        excludeCredentials: false,
      })

      const request = new Request(
        'http://localhost:8911/middleware/dbauth/auth?method=webAuthnRegOptions',
        {
          method: 'GET',
        },
      )

      const req = new MWRequest(request)

      const options: DbAuthMiddlewareOptions = {
        cookieName: 'session_8911',
        getCurrentUser: async () => {
          return {}
        },
        dbAuthHandler: async () => {
          return {
            body: regOptionsBody,
            headers: {},
            statusCode: 200,
          }
        },
      }
      const [middleware] = initDbAuthMiddleware(options)

      const res = await middleware(req, MiddlewareResponse.next())
      expect(res?.body).toBe(regOptionsBody)
    })
    // @todo: implement the following tests when try out webAuth
    //   it('handles a webAuthnRegister', async () => {
    //     //: 'POST',
    //   })
    //   it('handles a webAuthnAuthOptions', async () => {
    //     //: 'GET',
    //   })
    //   it('handles a webAuthnAuthenticate', async () => {
    //     //: 'POST',
    //   })
  })

  describe('exception case handling', async () => {
    const unauthenticatedServerAuthState = {
      ...middlewareDefaultAuthProviderState,
      cookieHeader: null,
      roles: [],
    }

    beforeAll(() => {
      // So that we don't see errors in console when running negative cases
      vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    it('handles a POST that is not one of the supported dbAuth verbs and still build headers when passing along the request', async () => {
      const request = new Request(
        'http://localhost:8911/middleware/dbauth/unsupportedVerb',
        {
          method: 'POST',
          body: JSON.stringify({}),
          headers: {},
        },
      )

      const req = new MWRequest(request)

      const options: DbAuthMiddlewareOptions = {
        cookieName: 'session_8911',
        getCurrentUser: async () => {
          return {}
        },
        dbAuthHandler: async () => {
          return {
            body: JSON.stringify({}),
            headers: {
              one: 'header-one',
              two: 'header-two',
            },
            statusCode: 200,
          }
        },
      }
      const [middleware] = initDbAuthMiddleware(options)

      const res = await middleware(req, MiddlewareResponse.next())

      expect(res).toBeDefined()
      expect(res?.headers.get('one')).toBe('header-one')
      expect(res?.headers.get('two')).toBe('header-two')

      const serverAuthState = req.serverAuthState.get()
      expect(serverAuthState).toHaveProperty('isAuthenticated', false)
    })

    it('handles a GET request with incorrect cookies (bad decrypt)', async () => {
      const request = new Request(
        'http://localhost:8911/functions/bad-cookie',
        {
          method: 'GET',
          headers: {
            Cookie:
              'session_8911=some-bad-encrypted-cookie;auth-provider=dbAuth',
          },
        },
      )

      const mwReq = new MWRequest(request)

      const options: DbAuthMiddlewareOptions = {
        cookieName: 'session_8911',
        getCurrentUser: async () => {
          return {}
        },
        dbAuthHandler: async () => {
          return {
            body: JSON.stringify({}),
            headers: {},
            statusCode: 200,
          }
        },
      }
      const [middleware] = initDbAuthMiddleware(options)

      const res = await middleware(mwReq, MiddlewareResponse.next())
      expect(res).toBeDefined()

      const serverAuthState = mwReq.serverAuthState.get()
      expect(serverAuthState).toEqual({
        ...unauthenticatedServerAuthState,
        cookieHeader:
          'session_8911=some-bad-encrypted-cookie;auth-provider=dbAuth',
      })

      expect(res?.toResponse().headers.getSetCookie()).toEqual([
        // Expired cookies, will be removed by browser
        'session_8911=; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'auth-provider=; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
      ])
    })

    it('handles a GET request with some cookies, but no auth related cookies', async () => {
      const request = new Request(
        'http://localhost:8911/functions/bad-cookie',
        {
          method: 'GET',
          headers: {
            Cookie: 'not-auth=some-value;other-cookie=foobar',
          },
        },
      )

      const mwReq = new MWRequest(request)

      const options: DbAuthMiddlewareOptions = {
        cookieName: 'session_8911',
        getCurrentUser: async () => {
          return {}
        },
        dbAuthHandler: async () => {
          return {
            body: JSON.stringify({}),
            headers: {},
            statusCode: 200,
          }
        },
      }
      const [middleware] = initDbAuthMiddleware(options)

      const res = await middleware(mwReq, MiddlewareResponse.next())
      expect(res).toBeDefined()

      const serverAuthState = mwReq.serverAuthState.get()
      expect(serverAuthState).toEqual({
        ...unauthenticatedServerAuthState,
        cookieHeader: 'not-auth=some-value;other-cookie=foobar',
      })

      expect(res?.toResponse().headers.getSetCookie()).toEqual([
        // Not setting any cookies to expire
      ])
    })

    it('handles a GET request with auth-provider cookie, but no session cookie', async () => {
      const request = new Request(
        'http://localhost:8911/functions/bad-cookie',
        {
          method: 'GET',
          headers: {
            Cookie: 'not-auth=some-value;auth-provider=dbAuth',
          },
        },
      )

      const mwReq = new MWRequest(request)

      const options: DbAuthMiddlewareOptions = {
        cookieName: 'session_8911',
        getCurrentUser: async () => {
          return {}
        },
        dbAuthHandler: async () => {
          return {
            body: JSON.stringify({}),
            headers: {},
            statusCode: 200,
          }
        },
      }
      const [middleware] = initDbAuthMiddleware(options)

      const res = await middleware(mwReq, MiddlewareResponse.next())
      expect(res).toBeDefined()

      const serverAuthState = mwReq.serverAuthState.get()
      expect(serverAuthState).toEqual({
        ...unauthenticatedServerAuthState,
        cookieHeader: 'not-auth=some-value;auth-provider=dbAuth',
      })

      expect(res?.toResponse().headers.getSetCookie()).toEqual([
        // Expired cookies, will be removed by browser
        'session_8911=; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'auth-provider=; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
      ])
    })

    it('handles a GET request with valid session cookie, but no auth-provider cookie', async () => {
      const request = new Request(
        'http://localhost:8911/functions/bad-cookie',
        {
          method: 'GET',
          headers: {
            Cookie: 'session_8911=this_is_the_only_correct_session',
          },
        },
      )

      const mwReq = new MWRequest(request)

      const options: DbAuthMiddlewareOptions = {
        cookieName: 'session_8911',
        getCurrentUser: async () => {
          return {}
        },
        dbAuthHandler: async () => {
          return {
            body: JSON.stringify({}),
            headers: {},
            statusCode: 200,
          }
        },
      }
      const [middleware] = initDbAuthMiddleware(options)

      const res = await middleware(mwReq, MiddlewareResponse.next())
      expect(res).toBeDefined()

      const serverAuthState = mwReq.serverAuthState.get()
      expect(serverAuthState).toEqual({
        ...unauthenticatedServerAuthState,
        cookieHeader: 'session_8911=this_is_the_only_correct_session',
      })

      // Because we don't have the dbAuth auth-provider cookie set the code
      // should not expire the session cookie, because it could belong to
      // someone else (i.e. not dbAuth)
      expect(res?.toResponse().headers.getSetCookie()).toEqual([
        // Don't set any cookies to expire
      ])
    })

    it('handles a GET request with invalid session cookie and no auth-provider cookie', async () => {
      const request = new Request(
        'http://localhost:8911/functions/bad-cookie',
        {
          method: 'GET',
          headers: {
            Cookie: 'session_8911=invalid',
          },
        },
      )

      const mwReq = new MWRequest(request)

      const options: DbAuthMiddlewareOptions = {
        cookieName: 'session_8911',
        getCurrentUser: async () => {
          return {}
        },
        dbAuthHandler: async () => {
          return {
            body: JSON.stringify({}),
            headers: {},
            statusCode: 200,
          }
        },
      }
      const [middleware] = initDbAuthMiddleware(options)

      const res = await middleware(mwReq, MiddlewareResponse.next())
      expect(res).toBeDefined()

      const serverAuthState = mwReq.serverAuthState.get()
      expect(serverAuthState).toEqual({
        ...unauthenticatedServerAuthState,
        cookieHeader: 'session_8911=invalid',
      })

      // Because we don't have the dbAuth auth-provider cookie set the code
      // should not expire the session cookie, because it could belong to
      // someone else (i.e. not dbAuth)
      expect(res?.toResponse().headers.getSetCookie()).toEqual([
        // Don't set any cookies to expire
      ])
    })

    it('handles a GET request with no cookies', async () => {
      const request = new Request('http://localhost:8911/functions/no-cookie', {
        method: 'GET',
        headers: {},
      })

      const req = new MWRequest(request)

      const options: DbAuthMiddlewareOptions = {
        cookieName: 'session_8911',
        getCurrentUser: async () => {
          return {}
        },
        dbAuthHandler: async () => {
          return {
            body: JSON.stringify({}),
            headers: {},
            statusCode: 200,
          }
        },
      }
      const [middleware] = initDbAuthMiddleware(options)

      const res = await middleware(req, MiddlewareResponse.next())
      expect(res).toBeDefined()

      const serverAuthState = req.serverAuthState.get()
      expect(serverAuthState).toHaveProperty('isAuthenticated', false)
    })
  })
})
