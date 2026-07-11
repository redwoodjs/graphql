import type { ClientContext } from 'aws-lambda'
import jwt, { TokenExpiredError } from 'jsonwebtoken'

import type { Decoder } from '@redwoodjs/api'

type NetlifyContext = ClientContext & {
  user?: Record<string, unknown>
}

interface NetlifyTokenPayload extends Record<string, unknown> {
  exp: number
  sub: string
  email: string
  app_metadata: Record<string, unknown>
  user_metadata: Record<string, unknown>
}

export const authDecoder: Decoder = async (token, type, req) => {
  if (type !== 'netlify') {
    return null
  }

  // Netlify verifies and decodes the JWT before the request is passed to our
  // Serverless function, so the decoded JWT is already available in production.
  // For development and test we can't verify the token because we don't have
  // the signing key. Just decoding the token is the best we can do to emulate
  // the native Netlify experience
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.NODE_ENV === 'test'
  ) {
    // In dev, we don't have access to the JWT private key to verify
    // So we simulate a verification
    const decodedToken = jwt.decode(token) as NetlifyTokenPayload
    const nowTimestamp = Math.floor(Date.now() / 1000)

    if (nowTimestamp >= decodedToken.exp) {
      throw new TokenExpiredError(
        'jwt expired',
        new Date(decodedToken.exp * 1000),
      )
    }

    return decodedToken
  } else {
    const clientContext = req.context?.clientContext as NetlifyContext
    return clientContext?.user || null
  }
}
