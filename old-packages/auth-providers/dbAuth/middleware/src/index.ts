import type { APIGatewayProxyEvent, Context } from 'aws-lambda'

import type { DbAuthResponse } from '@redwoodjs/auth-dbauth-api'
import dbAuthApi from '@redwoodjs/auth-dbauth-api'
// ^^ above package is still CJS, and named exports aren't supported in import statements
const { dbAuthSession, generateCookieName } = dbAuthApi
import type { GetCurrentUser } from '@redwoodjs/graphql-server'
import { MiddlewareResponse } from '@redwoodjs/web/middleware'
import type { Middleware, MiddlewareRequest } from '@redwoodjs/web/middleware'

import { defaultGetRoles } from './defaultGetRoles.js'

export interface DbAuthMiddlewareOptions {
  cookieName?: string
  dbAuthUrl?: string
  // @NOTE: we never pass lambda event or contexts, when using middleware
  // this is because in existing projects have it typed api/src/functions/auth.ts
  dbAuthHandler: (
    req: Request | APIGatewayProxyEvent,
    context?: Context,
  ) => DbAuthResponse
  getRoles?: (decoded: any) => string[]
  getCurrentUser: GetCurrentUser
}

export const initDbAuthMiddleware = ({
  dbAuthHandler,
  getCurrentUser,
  getRoles = defaultGetRoles,
  cookieName,
  dbAuthUrl = '/middleware/dbauth',
}: DbAuthMiddlewareOptions): [Middleware, '*'] => {
  const mw: Middleware = async (req, res = MiddlewareResponse.next()) => {
    console.log('dbAuthUrl', dbAuthUrl)
    console.log('req.url', req.url)

    // Handoff POST and some GET requests to the dbAuthHandler. The url is
    // configurable on the dbAuth client side.
    // This is where we handle login, logout, and signup, etc., no need to
    // enrich the context
    if (req.url.includes(dbAuthUrl)) {
      // Short circuit here ...
      // if the call came from packages/auth-providers/dbAuth/web/src/getCurrentUserFromMiddleware.ts
      if (req.url.includes(`${dbAuthUrl}/currentUser`)) {
        const validatedSession = await validateSession({
          req,
          cookieName,
          getCurrentUser,
        })

        if (validatedSession) {
          return new MiddlewareResponse(
            JSON.stringify({ currentUser: validatedSession.currentUser }),
          )
        } else {
          return new MiddlewareResponse(JSON.stringify({ currentUser: null }))
        }
      } else {
        const output = await dbAuthHandler(req)
        console.log('output', output)
        const finalHeaders = new Headers()

        Object.entries(output.headers).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            value.forEach((mvhHeader) => finalHeaders.append(key, mvhHeader))
          } else {
            finalHeaders.append(key, value)
          }
        })

        return new MiddlewareResponse(output.body, {
          headers: finalHeaders,
          status: output.statusCode,
        })
      }
    }

    const cookieHeader = req.headers.get('Cookie')

    // If there is no 'auth-provider' cookie, then the user is not
    // authenticated
    if (!cookieHeader?.includes('auth-provider')) {
      // Let the AuthContext fallback to its default value
      return res
    }

    // At this point there might, or might not, be a dbAuth session cookie
    // available.
    // We treat the absence of the dbAuth session cookie the same way we treat
    // an invalid session cookie – we clear server auth state and auth related
    // cookies

    // Call the dbAuth auth decoder. For dbAuth we have direct access to the
    // `dbAuthSession` function.
    // Other providers will be slightly different.
    const validatedSession = await validateSession({
      req,
      cookieName,
      getCurrentUser,
    })

    if (validatedSession) {
      const { currentUser, decryptedSession } = validatedSession

      req.serverAuthState.set({
        currentUser,
        loading: false,
        isAuthenticated: !!currentUser,
        hasError: false,
        userMetadata: currentUser, // dbAuth doesn't have userMetadata
        cookieHeader,
        roles: getRoles(decryptedSession),
      })
    } else {
      // Clear server auth context
      req.serverAuthState.clear()

      // Note we have to use ".unset" and not ".clear"
      // because we want to remove these cookies from the browser
      res.cookies.unset(generateCookieName(cookieName))
      res.cookies.unset('auth-provider')
    }

    return res
  }

  // Return a tuple and wildcard route pattern
  // Just to make it more difficult for user to accidentally misconfigure
  return [mw, '*']
}

interface ValidateParams {
  req: MiddlewareRequest
  getCurrentUser: GetCurrentUser
  cookieName?: string
}

async function validateSession({
  req,
  cookieName,
  getCurrentUser,
}: ValidateParams) {
  let decryptedSession: any

  try {
    // If there's no session cookie the return value will be `null`.
    // If there is a session cookie, but it can't be decrypted, an error will
    // be thrown
    decryptedSession = dbAuthSession(
      req as Request,
      generateCookieName(cookieName),
    )
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('Could not decrypt dbAuth session', e)
    }

    return undefined
  }

  if (!decryptedSession) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(
        'No dbAuth session cookie found. Looking for a cookie named:',
        cookieName,
      )
    }

    return undefined
  }

  const currentUser = await getCurrentUser(
    decryptedSession,
    {
      type: 'dbAuth',
      schema: 'cookie',
      // @MARK: We pass the entire cookie header as a token. This isn't
      // actually the token!
      // At this point the Cookie header is guaranteed, because otherwise a
      // decryptionError would have been thrown
      token: req.headers.get('Cookie') as string,
    },
    {
      // MWRequest is a superset of Request
      event: req,
    },
  )

  return { currentUser, decryptedSession }
}

export default initDbAuthMiddleware
