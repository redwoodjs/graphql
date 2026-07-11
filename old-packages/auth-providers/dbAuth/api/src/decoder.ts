import type { APIGatewayProxyEvent } from 'aws-lambda'

import type { Decoder } from '@redwoodjs/api'

import { dbAuthSession } from './shared'

export const createAuthDecoder = (cookieNameTemplate: string): Decoder => {
  return async (_token, type, req) => {
    if (type !== 'dbAuth') {
      return null
    }

    const session = dbAuthSession(req.event, cookieNameTemplate)

    // We no longer compare the session id with the bearer token
    return session
  }
}

/** @deprecated use `createAuthDecoder` */
export const authDecoder: Decoder = async (
  _authHeaderValue: string,
  type: string,
  req: { event: APIGatewayProxyEvent | Request },
) => {
  if (type !== 'dbAuth') {
    return null
  }

  // Passing `undefined` as the second argument to `dbAuthSession` will make
  // it fall back to the default cookie name `session`, making it backwards
  // compatible with existing RW apps.
  const session = dbAuthSession(req.event, undefined)

  return session
}
