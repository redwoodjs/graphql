import { Request as ArdaRequest } from '@whatwg-node/fetch'
import { describe, expect, test } from 'vitest'

import type { ServerAuthState } from '@redwoodjs/auth'

import { MiddlewareRequest, createMiddlewareRequest } from './MiddlewareRequest'

describe('MiddlewareRequest', () => {
  test('Converts a Web API Request object correctly', () => {
    const req = new Request('http://redwoodjs.com', {
      method: 'POST',
      body: JSON.stringify({
        hello: 'world',
      }),
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'foo=bar',
        'X-Custom-Header': 'sweet',
      },
    })
    const mReq = createMiddlewareRequest(req)

    expect(mReq.cookies.get('foo')).toStrictEqual('bar')
    expect(mReq.method).toStrictEqual('POST')
    expect(mReq.headers.get('Content-Type')).toStrictEqual('application/json')

    // note the lower case header name
    expect(mReq.headers.get('x-custom-header')).toStrictEqual('sweet')
  })

  test('Converts whatwg-node/fetch Request correctly', () => {
    const whatWgRequest = new ArdaRequest(
      'https://github.com/ardatan/whatwg-node',
      {
        method: 'PUT',
        body: JSON.stringify({
          hello: 'world',
        }),
        headers: {
          Cookie: 'errybody=lets-funk',
          'X-Custom-Header': 'beatdrop',
        },
      },
    )

    const mReq = createMiddlewareRequest(whatWgRequest)

    expect(mReq.cookies.get('errybody')).toStrictEqual('lets-funk')
    expect(mReq.method).toStrictEqual('PUT')

    expect(mReq.headers.get('x-custom-header')).toStrictEqual('beatdrop')
  })

  test('Has a default server auth state', () => {
    const mwReq = new MiddlewareRequest(
      new Request('http://redwoodjs.com', {
        headers: {
          Cookie: 'foo=bar',
        },
      }),
    )

    const authState = mwReq.serverAuthState.get()
    expect(authState?.cookieHeader).toStrictEqual('foo=bar')
    expect(authState?.isAuthenticated).toBe(false)
  })

  test('Can attach and retrieve server auth state', () => {
    const req = new Request('http://redwoodjs.com')
    const FAKE_AUTH_CONTEXT = {
      currentUser: {
        name: 'Danny',
      },
      isAuthenticated: true,
    } as unknown as ServerAuthState
    const mReq = createMiddlewareRequest(req)

    mReq.serverAuthState.set(FAKE_AUTH_CONTEXT)

    expect(mReq.serverAuthState.get()).toStrictEqual(FAKE_AUTH_CONTEXT)
  })

  test('Can clear auth state', () => {
    const mwReq = new MiddlewareRequest(
      new Request('http://redwoodjs.com', {
        headers: {
          Cookie: 'foo=bar',
        },
      }),
    )
    const FAKE_AUTH_CONTEXT = {
      isAuthenticated: true,
    } as unknown as ServerAuthState

    mwReq.serverAuthState.set(FAKE_AUTH_CONTEXT)

    expect(mwReq.serverAuthState.get()?.isAuthenticated).toBe(true)

    mwReq.serverAuthState.clear()

    expect(mwReq.serverAuthState.get().isAuthenticated).toBe(false)
  })
})
