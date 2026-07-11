import jwt from 'jsonwebtoken'
import jwksClient from 'jwks-rsa'

import type { Decoder } from '@redwoodjs/api'

/**
 * This takes an auth0 jwt and verifies it. It returns something like this:
 * ```js
 * {
 *   iss: 'https://<AUTH0_DOMAIN>/',
 *   sub: 'auth0|xxx',
 *   aud: [ 'api.billable', 'https://<AUTH0_DOMAIN>/userinfo' ],
 *   iat: 1588800141,
 *   exp: 1588886541,
 *   azp: 'QOsYIlHvCLqLzmfDU0Z3upFdu1znlkqK',
 *   scope: 'openid profile email'
 * }
 * ```
 *
 * You can use `sub` as a stable reference to your user, but if you want the email
 * address you can set a context object[^0] in rules[^1]:
 *
 * ^0: https://auth0.com/docs/rules/references/context-object
 * ^1: https://manage.auth0.com/#/rules/new
 *
 */
export const verifyAuth0Token = (
  bearerToken: string,
): Promise<null | Record<string, unknown>> => {
  return new Promise((resolve, reject) => {
    const { AUTH0_DOMAIN, AUTH0_AUDIENCE } = process.env
    if (!AUTH0_DOMAIN || !AUTH0_AUDIENCE) {
      throw new Error(
        '`AUTH0_DOMAIN` or `AUTH0_AUDIENCE` env vars are not set.',
      )
    }

    const client = jwksClient({
      jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`,
    })

    jwt.verify(
      bearerToken,
      (header, callback) => {
        client.getSigningKey(header.kid as string, (error, key) => {
          callback(error, key?.getPublicKey())
        })
      },
      {
        audience: AUTH0_AUDIENCE,
        issuer: `https://${AUTH0_DOMAIN}/`,
        algorithms: ['RS256'],
      },
      (verifyError, decoded) => {
        if (verifyError) {
          return reject(verifyError)
        }
        resolve(
          typeof decoded === 'undefined'
            ? null
            : (decoded as Record<string, unknown>),
        )
      },
    )
  })
}

export const authDecoder: Decoder = async (token: string, type: string) => {
  if (type !== 'auth0') {
    return null
  }

  return verifyAuth0Token(token)
}
