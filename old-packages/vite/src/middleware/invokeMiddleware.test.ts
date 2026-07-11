import type { MockInstance } from 'vitest'
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'

import { middlewareDefaultAuthProviderState } from '@redwoodjs/auth'
import type { ServerAuthState } from '@redwoodjs/auth/ServerAuthProvider'
import { createServerStorage } from '@redwoodjs/server-store'
import type { Middleware, MiddlewareRequest } from '@redwoodjs/web/middleware'
import { MiddlewareResponse } from '@redwoodjs/web/middleware'

import { invoke } from './invokeMiddleware'

describe('Invoke middleware', () => {
  beforeAll(() => {
    createServerStorage()
  })

  const unauthenticatedServerAuthState = {
    ...middlewareDefaultAuthProviderState,
    roles: [],
    cookieHeader: null,
  }

  test('returns a MiddlewareResponse, even if no middleware defined', async () => {
    const [mwRes, authState] = await invoke(new Request('https://example.com'))
    expect(mwRes).toBeInstanceOf(MiddlewareResponse)
    expect(authState).toEqual(unauthenticatedServerAuthState)
  })

  test('extracts auth state correctly, and always returns a MWResponse', async () => {
    const BOB = { name: 'Bob', occupation: 'The builder' }
    const fakeMiddleware = (req: MiddlewareRequest) => {
      req.serverAuthState.set({
        user: BOB,
      } as unknown as ServerAuthState)
    }

    const [mwRes, authState] = await invoke(
      new Request('https://example.com'),
      fakeMiddleware,
    )

    expect(mwRes).toBeInstanceOf(MiddlewareResponse)
    expect(authState).toEqual({
      user: BOB,
    })
  })

  describe('throwing middleware behavior', () => {
    let consoleErrorSpy: MockInstance

    beforeAll(() => {
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterAll(() => {
      consoleErrorSpy.mockRestore()
    })

    // This means that will CONTINUE execution of the middleware chain, and react rendering
    test('returns a MiddlewareResponse, even if middleware throws', async () => {
      const throwingMiddleware = () => {
        throw new Error('I want to break free')
      }

      const [mwRes, authState] = await invoke(
        new Request('https://example.com'),
        throwingMiddleware,
      )

      expect(mwRes).toBeInstanceOf(MiddlewareResponse)
      expect(authState).toEqual(unauthenticatedServerAuthState)
    })

    // A short-circuit is a way to stop the middleware chain immediately, and return a response
    test('will return a MiddlewareResposne, if a short-circuit is thrown', async () => {
      const shortCircuitMW: Middleware = (_req, res) => {
        res.shortCircuit('Zap', {
          status: 999,
          statusText: 'Ouch',
        })
      }

      const [mwRes, authState] = await invoke(
        new Request('https://example.com'),
        shortCircuitMW,
      )

      expect(mwRes).toBeInstanceOf(MiddlewareResponse)
      expect(mwRes.body).toEqual('Zap')
      expect(mwRes.status).toEqual(999)
      expect(mwRes.statusText).toEqual('Ouch')
      expect(authState).toEqual(unauthenticatedServerAuthState)
    })

    test('can set extra properties in the shortcircuit response', async () => {
      const testMw: Middleware = () => {
        const shortCircuitRes = new MiddlewareResponse('Zap')

        shortCircuitRes.cookies.set('monster', 'nomnomnom', {
          expires: new Date('2022-01-01'),
        })
        shortCircuitRes.headers.set('redwood', 'is awesome')

        shortCircuitRes.shortCircuit()
      }

      const [mwRes, authState] = await invoke(
        new Request('https://example.com'),
        testMw,
      )

      expect(mwRes).toBeInstanceOf(MiddlewareResponse)
      expect(mwRes.body).toEqual('Zap')
      expect(mwRes.status).toEqual(200)

      expect(mwRes.toResponse().headers.getSetCookie()).toContainEqual(
        'monster=nomnomnom; Expires=Sat, 01 Jan 2022 00:00:00 GMT',
      )
      expect(mwRes.toResponse().headers.get('redwood')).toStrictEqual(
        'is awesome',
      )

      expect(authState).toEqual(unauthenticatedServerAuthState)
    })
  })
})
