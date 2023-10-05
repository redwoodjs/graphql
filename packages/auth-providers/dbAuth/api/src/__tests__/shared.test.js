import path from 'node:path'

import CryptoJS from 'crypto-js'

import * as error from '../errors'
import {
  extractCookie,
  getSession,
  cookieName,
  hashPassword,
  decryptSession,
  dbAuthSession,
  webAuthnSession,
} from '../shared'

const FIXTURE_PATH = path.resolve(
  __dirname,
  '../../../../../../__fixtures__/example-todo-main'
)
process.env.SESSION_SECRET = 'nREjs1HPS7cFia6tQHK70EWGtfhOgbqJQKsHQz3S'

const encrypt = (data) => {
  return CryptoJS.AES.encrypt(data, process.env.SESSION_SECRET).toString()
}

beforeAll(() => {
  process.env.RWJS_CWD = FIXTURE_PATH
})

afterAll(() => {
  delete process.env.RWJS_CWD
})

describe('getSession()', () => {
  it('returns null if no text', () => {
    expect(getSession()).toEqual(null)
  })

  it('returns null if no session cookie', () => {
    expect(getSession('foo=bar')).toEqual(null)
  })

  it('returns the value of the session cookie', () => {
    expect(getSession('dbauth_session_8911=qwerty')).toEqual('qwerty')
  })

  it('returns the value of the session cookie when there are multiple cookies', () => {
    expect(getSession('foo=bar;dbauth_session_8911=qwerty')).toEqual('qwerty')
    expect(getSession('dbauth_session_8911=qwerty;foo=bar')).toEqual('qwerty')
  })

  it('returns the value of the session cookie when there are multiple cookies separated by spaces (iOS Safari)', () => {
    expect(getSession('foo=bar; dbauth_session_8911=qwerty')).toEqual('qwerty')
    expect(getSession('dbauth_session_8911=qwerty; foo=bar')).toEqual('qwerty')
  })
})

describe('cookieName()', () => {
  it('returns the default cookie name', () => {
    expect(cookieName()).toEqual('dbauth_session_8911')
  })

  describe('cookie name env var', () => {
    beforeEach(() => {
      process.env.RWJS_DBAUTH_COOKIE_NAME = 'my_cookie_name'
    })

    afterEach(() => {
      delete process.env.RWJS_DBAUTH_COOKIE_NAME
    })

    it('allows you to specify the cookie name using the RWJS_DBAUTH_COOKIE_NAME env var', () => {
      expect(cookieName()).toEqual('my_cookie_name')
    })
  })
})

describe('decryptSession()', () => {
  it('returns an empty array if no session', () => {
    expect(decryptSession()).toEqual([])
  })

  it('returns an empty array if session is empty', () => {
    expect(decryptSession('')).toEqual([])
    expect(decryptSession(' ')).toEqual([])
  })

  it('throws an error if decryption errors out', () => {
    expect(() => decryptSession('session=qwerty')).toThrow(
      error.SessionDecryptionError
    )
  })

  it('returns an array with contents of encrypted cookie parts', () => {
    const first = { foo: 'bar' }
    const second = 'abcd'
    const text = encrypt(JSON.stringify(first) + ';' + second)

    expect(decryptSession(text)).toEqual([first, second])
  })
})

describe('dbAuthSession()', () => {
  it('returns null if no cookies', () => {
    const event = { headers: {} }

    expect(dbAuthSession(event)).toEqual(null)
  })

  it('return session given event', () => {
    const first = { foo: 'bar' }
    const second = 'abcd'
    const text = encrypt(JSON.stringify(first) + ';' + second)
    const event = {
      headers: {
        cookie: `dbauth_session_8911=${text}`,
      },
    }

    expect(dbAuthSession(event)).toEqual(first)
  })
})

describe('webAuthnSession', () => {
  it('returns null if no cookies', () => {
    expect(webAuthnSession({ headers: {} })).toEqual(null)
  })

  it('returns the webAuthn cookie data', () => {
    const output = webAuthnSession({
      headers: { cookie: 'session=abcd1234;webAuthn=zyxw9876' },
    })

    expect(output).toEqual('zyxw9876')
  })
})

describe('hashPassword', () => {
  it('hashes a password with a given salt and returns both', () => {
    const [hash, salt] = hashPassword(
      'password',
      '2ef27f4073c603ba8b7807c6de6d6a89'
    )

    expect(hash).toEqual(
      '0c2b24e20ee76a887eac1415cc2c175ff961e7a0f057cead74789c43399dd5ba'
    )
    expect(salt).toEqual('2ef27f4073c603ba8b7807c6de6d6a89')
  })

  it('hashes a password with a generated salt if none provided', () => {
    const [hash, salt] = hashPassword('password')

    expect(hash).toMatch(/^[a-f0-9]+$/)
    expect(hash.length).toEqual(64)
    expect(salt).toMatch(/^[a-f0-9]+$/)
    expect(salt.length).toEqual(32)
  })

  describe('session cookie extraction', () => {
    let event

    const encryptToCookie = (data) => {
      return `session=${CryptoJS.AES.encrypt(data, process.env.SESSION_SECRET)}`
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
        JSON.stringify({ id: 9999999999 }) + ';' + 'token'
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

      it('extracts GraphiQL cookie from the header extensions', () => {
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

      it('overwrites cookie with event header GraphiQL when in dev', () => {
        const sessionCookie = encryptToCookie(
          JSON.stringify({ id: 9999999999 }) + ';' + 'token'
        )

        event = {
          headers: {
            cookie: sessionCookie,
          },
        }

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
    })
  })
})
