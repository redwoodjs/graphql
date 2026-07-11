import crypto from 'node:crypto'

import type { APIGatewayProxyEvent } from 'aws-lambda'

import type { CorsHeaders } from '@redwoodjs/api'
import { getEventHeader, isFetchApiRequest } from '@redwoodjs/api'
import { getConfig, getConfigPath } from '@redwoodjs/project-config'

import * as DbAuthError from './errors'

type ScryptOptions = {
  cost?: number
  blockSize?: number
  parallelization?: number
  N?: number
  r?: number
  p?: number
  maxmem?: number
}

const DEFAULT_SCRYPT_OPTIONS: ScryptOptions = {
  cost: 2 ** 14,
  blockSize: 8,
  parallelization: 1,
}

const getPort = () => {
  let configPath

  try {
    configPath = getConfigPath()
  } catch {
    // If this throws, we're in a serverless environment, and the `redwood.toml` file doesn't exist.
    return 8911
  }

  return getConfig(configPath).api.port
}

// When in development environment, check for auth impersonation cookie
// if user has generated graphiql headers
const eventGraphiQLHeadersCookie = (event: APIGatewayProxyEvent | Request) => {
  if (process.env.NODE_ENV !== 'development') {
    return
  }

  const impersationationHeader = getEventHeader(
    event,
    'rw-studio-impersonation-cookie',
  )

  if (impersationationHeader) {
    return impersationationHeader
  }

  // TODO: Remove code below when we remove the old way of passing the cookie
  // from Studio, and decide it's OK to break compatibility with older Studio
  // versions
  try {
    if (!isFetchApiRequest(event)) {
      const jsonBody = JSON.parse(event.body ?? '{}')
      return (
        jsonBody?.extensions?.headers?.cookie ||
        jsonBody?.extensions?.headers?.Cookie
      )
    }
  } catch {
    // sometimes the event body isn't json
    return
  }
}

// decrypts session text using old CryptoJS algorithm (using node:crypto library)
const legacyDecryptSession = (encryptedText: string) => {
  const cypher = Buffer.from(encryptedText, 'base64')
  const salt = cypher.slice(8, 16)
  const password = Buffer.concat([
    Buffer.from(process.env.SESSION_SECRET as string, 'binary'),
    salt,
  ])
  const md5Hashes = []
  let digest = password
  for (let i = 0; i < 3; i++) {
    md5Hashes[i] = crypto.createHash('md5').update(digest).digest()
    digest = Buffer.concat([md5Hashes[i], password])
  }
  const key = Buffer.concat([md5Hashes[0], md5Hashes[1]])
  const iv = md5Hashes[2]
  const contents = cypher.slice(16)
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)

  return decipher.update(contents) + decipher.final('utf-8')
}

// Extracts the session cookie from an event, handling both
// development environment GraphiQL headers and production environment headers.
export const extractCookie = (event: APIGatewayProxyEvent | Request) => {
  return eventGraphiQLHeadersCookie(event) || getEventHeader(event, 'Cookie')
}

// whether this encrypted session was made with the old CryptoJS algorithm
export const isLegacySession = (text: string | undefined) => {
  if (!text) {
    return false
  }

  const [_encryptedText, iv] = text.split('|')
  return !iv
}

// decrypts the session cookie and returns an array: [data, csrf]
export const decryptSession = (text: string | null) => {
  if (!text || text.trim() === '') {
    return []
  }

  let decoded
  // if cookie contains a pipe then it was encrypted using the `node:crypto`
  // algorithm (first element is the encrypted data, second is the initialization vector)
  // otherwise fall back to using the older CryptoJS algorithm
  const [encryptedText, iv] = text.split('|')

  try {
    if (iv) {
      // decrypt using the `node:crypto` algorithm
      const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        (process.env.SESSION_SECRET as string).substring(0, 32),
        Buffer.from(iv, 'base64'),
      )
      decoded =
        decipher.update(encryptedText, 'base64', 'utf-8') +
        decipher.final('utf-8')
    } else {
      decoded = legacyDecryptSession(text)
    }

    const [data, csrf] = decoded.split(';')
    const json = JSON.parse(data)

    return [json, csrf]
  } catch {
    throw new DbAuthError.SessionDecryptionError()
  }
}

export const encryptSession = (dataString: string) => {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    (process.env.SESSION_SECRET as string).substring(0, 32),
    iv,
  )
  let encryptedData = cipher.update(dataString, 'utf-8', 'base64')
  encryptedData += cipher.final('base64')

  return `${encryptedData}|${iv.toString('base64')}`
}

// returns the actual value of the session cookie
export const getSession = (
  text: string | undefined,
  cookieNameTemplate: string | undefined,
) => {
  if (typeof text === 'undefined' || text === null) {
    return null
  }

  const cookieName = generateCookieName(cookieNameTemplate)

  const cookies = text.split(';')
  const sessionCookie = cookies.find((cookie) => {
    return cookie.split('=')[0].trim() === cookieName
  })

  if (!sessionCookie || sessionCookie === `${cookieName}=`) {
    return null
  }

  return sessionCookie.replace(`${cookieName}=`, '').trim()
}

// Convenience function to get session, decrypt, and return session data all
// at once. Accepts the `event` argument from a Lambda function call and the
// name of the dbAuth session cookie
export const dbAuthSession = (
  event: APIGatewayProxyEvent | Request,
  cookieNameTemplate: string | undefined,
) => {
  const sessionCookie = extractCookie(event)

  if (!sessionCookie) {
    return null
  }

  // This is a browser making a request
  const [session, _csrfToken] = decryptSession(
    getSession(sessionCookie, cookieNameTemplate),
  )
  return session
}

export const webAuthnSession = (event: APIGatewayProxyEvent | Request) => {
  const cookieHeader = extractCookie(event)

  if (!cookieHeader) {
    return null
  }

  const webAuthnCookie = cookieHeader.split(';').find((cook: string) => {
    return cook.split('=')[0].trim() === 'webAuthn'
  })

  if (!webAuthnCookie || webAuthnCookie === 'webAuthn=') {
    return null
  }

  return webAuthnCookie.split('=')[1].trim()
}

export const hashToken = (token: string) => {
  return crypto.createHash('sha256').update(token).digest('hex')
}

// hashes a password using either the given `salt` argument, or creates a new
// salt and hashes using that. Either way, returns an array with [hash, salt]
// normalizes the string in case it contains unicode characters: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize
// TODO: Add validation that the options are valid values for the scrypt algorithm
export const hashPassword = (
  text: string,
  {
    salt = crypto.randomBytes(32).toString('hex'),
    options = DEFAULT_SCRYPT_OPTIONS,
  }: { salt?: string; options?: ScryptOptions } = {},
) => {
  const encryptedString = crypto
    .scryptSync(text.normalize('NFC'), salt, 32, options)
    .toString('hex')
  const optionsToString = [
    options.cost,
    options.blockSize,
    options.parallelization,
  ]
  return [`${encryptedString}|${optionsToString.join('|')}`, salt]
}

// uses the old algorithm from CryptoJS:
//   CryptoJS.PBKDF2(password, salt, { keySize: 8 }).toString()
export const legacyHashPassword = (text: string, salt?: string) => {
  const useSalt = salt || crypto.randomBytes(32).toString('hex')
  return [
    crypto.pbkdf2Sync(text, useSalt, 1, 32, 'SHA1').toString('hex'),
    useSalt,
  ]
}

export function generateCookieName(template: string | undefined) {
  const port = getPort()
  const cookieName = template?.replace('%port%', '' + port) ?? 'session'

  return cookieName
}

/**
 * Returns a builder for a lambda response
 *
 * This is used as the final call to return a response from the dbAuth handler
 *
 * Converts "Set-Cookie" headers to an array of strings or a multiValueHeaders
 * object
 */
export function getDbAuthResponseBuilder(
  event: APIGatewayProxyEvent | Request,
) {
  return (
    response: {
      body?: string
      statusCode: number
      headers?: Headers
    },
    corsHeaders: CorsHeaders,
  ) => {
    const headers: Record<string, string | string[]> = {
      ...Object.fromEntries(response.headers?.entries() || []),
      ...corsHeaders,
    }

    const dbAuthResponse: {
      statusCode: number
      headers: Record<string, string | string[]>
      multiValueHeaders?: Record<string, string[]>
      body?: string
    } = {
      ...response,
      headers,
    }

    const setCookieHeaders = response.headers?.getSetCookie() || []

    if (setCookieHeaders.length > 0) {
      delete headers['set-cookie']
      delete headers['Set-Cookie']

      if (supportsMultiValueHeaders(event)) {
        dbAuthResponse.multiValueHeaders = {
          // Netlify wants 'Set-Cookie' headers to be capitalized
          // https://github.com/redwoodjs/redwood/pull/10889
          'Set-Cookie': setCookieHeaders,
        }
      } else {
        // If we do this for Netlify the lambda function will throw an error
        // https://github.com/redwoodjs/redwood/pull/10889
        headers['set-cookie'] = setCookieHeaders
      }
    }

    return dbAuthResponse
  }
}

// `'multiValueHeaders' in event` is true for both Netlify and Vercel
// but only Netlify actually supports it. Vercel will just ignore it
// https://github.com/vercel/vercel/issues/7820
function supportsMultiValueHeaders(event: APIGatewayProxyEvent | Request) {
  return (
    'multiValueHeaders' in event &&
    (!event.headers || !('x-vercel-id' in event.headers))
  )
}

export const extractHashingOptions = (text: string): ScryptOptions => {
  const [_hash, ...options] = text.split('|')

  if (options.length === 3) {
    return {
      cost: parseInt(options[0]),
      blockSize: parseInt(options[1]),
      parallelization: parseInt(options[2]),
    }
  } else {
    return {}
  }
}
