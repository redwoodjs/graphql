import crypto from 'node:crypto'
import path from 'node:path'

import type { APIGatewayProxyEvent } from 'aws-lambda'
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'

import * as error from '../errors'
import {
  extractCookie,
  getSession,
  generateCookieName,
  hashPassword,
  isLegacySession,
  legacyHashPassword,
  decryptSession,
  dbAuthSession,
  webAuthnSession,
  extractHashingOptions,
} from '../shared'

const FIXTURE_PATH = path.resolve(
  __dirname,
  '../../../../../../__fixtures__/example-todo-main',
)
const SESSION_SECRET = '540d03ebb00b441f8f7442cbc39958ad'

const encrypt = (data) => {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    SESSION_SECRET.substring(0, 32),
    iv,
  )
  let encryptedSession = cipher.update(data, 'utf-8', 'base64')
  encryptedSession += cipher.final('base64')

  return `${encryptedSession}|${iv.toString('base64')}`
}

function dummyEvent(cookie?: string) {
  return {
    headers: {
      cookie,
    },
  } as unknown as APIGatewayProxyEvent
}

beforeAll(() => {
  process.env.RWJS_CWD = FIXTURE_PATH
})

afterAll(() => {
  delete process.env.RWJS_CWD
})

describe('getSession()', () => {
  it('returns null if no text', () => {
    expect(getSession(undefined, 'session')).toEqual(null)
  })

  it('returns null if no session cookie', () => {
    expect(getSession('foo=bar', 'session')).toEqual(null)
  })

  it('returns the value of the session cookie', () => {
    expect(getSession('session_8911=qwerty', 'session_%port%')).toEqual(
      'qwerty',
    )
  })

  it('returns the value of the session cookie when there are multiple cookies', () => {
    expect(getSession('foo=bar;session=qwerty', 'session')).toEqual('qwerty')
    expect(getSession('session=qwerty;foo=bar', 'session')).toEqual('qwerty')
  })

  it('returns the value of the session cookie when there are multiple cookies separated by spaces (iOS Safari)', () => {
    expect(getSession('foo=bar; session=qwerty', 'session')).toEqual('qwerty')
    expect(getSession('session=qwerty; foo=bar', 'session')).toEqual('qwerty')
  })
})

describe('generateCookieName()', () => {
  it('returns the default cookie name', () => {
    expect(generateCookieName(undefined)).toEqual('session')
  })

  it('allows you to pass a cookie name to use', () => {
    expect(generateCookieName('my_cookie_name')).toEqual('my_cookie_name')
  })

  it('replaces %port% with a port number', () => {
    expect(generateCookieName('session_%port%_my_app')).toEqual(
      'session_8911_my_app',
    )
  })
})

describe('isLegacySession()', () => {
  it('returns `true` if the session cookie appears to be encrypted with CryptoJS', () => {
    expect(
      isLegacySession('U2FsdGVkX1+s7seQJnVgGgInxuXm13l8VvzA3Mg2fYg='),
    ).toEqual(true)
  })

  it('returns `false` if the session cookie appears to be encrypted with node:crypto', () => {
    expect(
      isLegacySession(
        'ko6iXKV11DSjb6kFJ4iwcf1FEqa5wPpbL1sdtKiV51Y=|cQaYkOPG/r3ILxWiFiz90w==',
      ),
    ).toEqual(false)
  })
})

describe('decryptSession()', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = SESSION_SECRET
  })

  it('returns an empty array if no session', () => {
    expect(decryptSession(null)).toEqual([])
  })

  it('returns an empty array if session is empty', () => {
    expect(decryptSession('')).toEqual([])
    expect(decryptSession(' ')).toEqual([])
  })

  it('throws an error if decryption errors out', () => {
    expect(() => decryptSession('session=qwerty')).toThrow(
      error.SessionDecryptionError,
    )
  })

  it('returns an array with contents of encrypted cookie parts', () => {
    const first = { foo: 'bar' }
    const second = 'abcd'
    const text = encrypt(JSON.stringify(first) + ';' + second)

    expect(decryptSession(text)).toEqual([first, second])
  })

  it('decrypts a session cookie that was created with the legacy CryptoJS algorithm', () => {
    process.env.SESSION_SECRET =
      'QKxN2vFSHAf94XYynK8LUALfDuDSdFowG6evfkFX8uszh4YZqhTiqEdshrhWbwbw'
    const [json] = decryptSession(
      'U2FsdGVkX1+s7seQJnVgGgInxuXm13l8VvzA3Mg2fYg=',
    )

    expect(json).toEqual({ id: 7 })
  })
})

describe('dbAuthSession()', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = SESSION_SECRET
  })

  it('returns null if no cookies', () => {
    expect(dbAuthSession(dummyEvent(), 'session_%port%')).toEqual(null)
  })

  it('return session given event', () => {
    const first = { foo: 'bar' }
    const second = 'abcd'
    const text = encrypt(JSON.stringify(first) + ';' + second)
    const event = dummyEvent(`session_8911=${text}`)

    expect(dbAuthSession(event, 'session_%port%')).toEqual(first)
  })
})

describe('webAuthnSession', () => {
  it('returns null if no cookies', () => {
    expect(webAuthnSession(dummyEvent())).toEqual(null)
  })

  it('returns the webAuthn cookie data', () => {
    const output = webAuthnSession(
      dummyEvent('session=abcd1234;webAuthn=zyxw9876'),
    )

    expect(output).toEqual('zyxw9876')
  })
})

describe('hashPassword', () => {
  it('hashes a password with a given salt and returns both', () => {
    const [hash, salt] = hashPassword('password', {
      salt: 'ba8b7807c6de6d6a892ef27f4073c603',
    })

    expect(hash).toEqual(
      '230847bea5154b6c7d281d09593ad1be26fa03a93c04a73bcc2b608c073a8213|16384|8|1',
    )
    expect(salt).toEqual('ba8b7807c6de6d6a892ef27f4073c603')
  })

  it('hashes a password with a generated salt if none provided', () => {
    const [hash, salt] = hashPassword('password')

    expect(hash).toMatch(/^[a-f0-9]+|16384|8|1$/)
    expect(hash.length).toEqual(74)
    expect(salt).toMatch(/^[a-f0-9]+$/)
    expect(salt.length).toEqual(64)
  })

  it('normalizes strings so utf-8 variants hash to the same output', () => {
    const salt = crypto.randomBytes(32).toString('hex')
    const [hash1] = hashPassword('\u0041\u006d\u00e9\u006c\u0069\u0065', {
      salt,
    }) // Amélie
    const [hash2] = hashPassword('\u0041\u006d\u0065\u0301\u006c\u0069\u0065', {
      salt,
    }) // Amélie but separate e and accent codepoints

    expect(hash1).toEqual(hash2)
  })

  it('encodes the scrypt difficulty options into the hash', () => {
    const [hash] = hashPassword('password', {
      options: { cost: 8192, blockSize: 16, parallelization: 2 },
    })
    const [_hash, cost, blockSize, parallelization] = hash.split('|')

    expect(cost).toEqual('8192')
    expect(blockSize).toEqual('16')
    expect(parallelization).toEqual('2')
  })
})

describe('legacyHashPassword', () => {
  it('hashes a password with CryptoJS given a salt and returns both', () => {
    const [hash, salt] = legacyHashPassword(
      'password',
      '2ef27f4073c603ba8b7807c6de6d6a89',
    )

    expect(hash).toEqual(
      '0c2b24e20ee76a887eac1415cc2c175ff961e7a0f057cead74789c43399dd5ba',
    )
    expect(salt).toEqual('2ef27f4073c603ba8b7807c6de6d6a89')
  })

  it('hashes a password with a generated salt if none provided', () => {
    const [hash, salt] = legacyHashPassword('password')

    expect(hash).toMatch(/^[a-f0-9]+$/)
    expect(hash.length).toEqual(64)
    expect(salt).toMatch(/^[a-f0-9]+$/)
    expect(salt.length).toEqual(64)
  })
})

describe('session cookie extraction', () => {
  let event

  const encryptToCookie = (data) => {
    return `session=${encrypt(data)}`
  }

  beforeEach(() => {
    event = {
      queryStringParameters: {},
      path: '/.redwood/functions/auth',
      headers: {},
    }
  })

  it('extracts from the event', () => {
    const cookie = encryptToCookie(
      JSON.stringify({ id: 9999999999 }) + ';' + 'token',
    )

    event = {
      headers: {
        cookie,
      },
    }

    expect(extractCookie(event)).toEqual(cookie)
  })

  it('extract cookie handles non-JSON event body', () => {
    event.body = ''

    expect(extractCookie(event)).toBeUndefined()
  })

  describe('when in development', () => {
    const curNodeEnv = process.env.NODE_ENV

    beforeAll(() => {
      // Session cookie from graphiQLHeaders only extracted in dev
      process.env.NODE_ENV = 'development'
    })

    afterAll(() => {
      process.env.NODE_ENV = curNodeEnv
      event = {}
      expect(process.env.NODE_ENV).toBe('test')
    })

    it('extract cookie handles non-JSON event body', () => {
      event.body = ''

      expect(extractCookie(event)).toBeUndefined()
    })

    it('extracts GraphiQL cookie from the body extensions', () => {
      const dbUserId = 42

      const cookie = encryptToCookie(JSON.stringify({ id: dbUserId }))
      event.body = JSON.stringify({
        extensions: {
          headers: {
            'auth-provider': 'dbAuth',
            cookie,
            authorization: 'Bearer ' + dbUserId,
          },
        },
      })

      expect(extractCookie(event)).toEqual(cookie)
    })

    it('extracts GraphiQL cookie from the rw-studio header (Fetch request)', () => {
      const dbUserId = 42

      const impersonatedCookie = encryptToCookie(
        JSON.stringify({ id: dbUserId }),
      )

      const req = new Request('http://localhost:8910/_rw_mw', {
        method: 'POST',
        headers: {
          'auth-provider': 'dbAuth',
          'rw-studio-impersonation-cookie': impersonatedCookie,
          authorization: 'Bearer ' + dbUserId,
        },
      })

      expect(extractCookie(req)).toEqual(impersonatedCookie)
    })

    it('impersonation cookie takes precendence', () => {
      const sessionCookie = encryptToCookie(
        JSON.stringify({ id: 9999999999 }) + ';' + 'token',
      )

      const dbUserId = 42

      const impersonatedCookie = encryptToCookie(
        JSON.stringify({ id: dbUserId }),
      )

      event = {
        headers: {
          cookie: sessionCookie, // This user doesn't exist
          'auth-provider': 'dbAuth',
          'rw-studio-impersonation-cookie': impersonatedCookie,
          authorization: 'Bearer ' + dbUserId,
        },
      }

      expect(extractCookie(event)).toEqual(impersonatedCookie)
    })
  })
})

describe('extractHashingOptions()', () => {
  it('returns an empty object if no options', () => {
    expect(extractHashingOptions('')).toEqual({})
    expect(
      extractHashingOptions(
        '0c2b24e20ee76a887eac1415cc2c175ff961e7a0f057cead74789c43399dd5ba',
      ),
    ).toEqual({})
    expect(
      extractHashingOptions(
        '0c2b24e20ee76a887eac1415cc2c175ff961e7a0f057cead74789c43399dd5ba|1',
      ),
    ).toEqual({})
    expect(
      extractHashingOptions(
        '0c2b24e20ee76a887eac1415cc2c175ff961e7a0f057cead74789c43399dd5ba|1|2',
      ),
    ).toEqual({})
  })

  it('returns an object with scrypt options', () => {
    expect(
      extractHashingOptions(
        '0c2b24e20ee76a887eac1415cc2c175ff961e7a0f057cead74789c43399dd5ba|16384|8|1',
      ),
    ).toEqual({
      cost: 16384,
      blockSize: 8,
      parallelization: 1,
    })
  })
})
