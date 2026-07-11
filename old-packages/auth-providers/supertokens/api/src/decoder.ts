import jwt from 'jsonwebtoken'
import type { SigningKey } from 'jwks-rsa'
import jwksClient from 'jwks-rsa'

import type { Decoder } from '@redwoodjs/api'

export const authDecoder: Decoder = async (token: string, type: string) => {
  if (type !== 'supertokens') {
    return null
  }

  return new Promise((resolve, reject) => {
    const { SUPERTOKENS_JWKS_URL } = process.env

    if (!SUPERTOKENS_JWKS_URL) {
      throw new Error('SUPERTOKENS_JWKS_URL env var is not set')
    }

    const client = jwksClient({
      jwksUri: SUPERTOKENS_JWKS_URL,
    })

    function getKey(header: any, callback: jwt.SigningKeyCallback) {
      client.getSigningKey(
        header.kid,
        function (err: Error | null, key?: SigningKey) {
          const signingKey = key?.getPublicKey()
          callback(err, signingKey)
        },
      )
    }

    jwt.verify(token, getKey, {}, function (err, decoded) {
      if (err) {
        return reject(err)
      }

      decoded = decoded || {}

      if (typeof decoded === 'string') {
        return resolve({ decoded })
      }

      return resolve(decoded)
    })
  })
}
