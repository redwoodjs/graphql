import { Response as PonyfillResponse } from '@whatwg-node/fetch'
import { describe, expect, test } from 'vitest'

import {
  MiddlewareResponse,
  MiddlewareShortCircuit,
} from './MiddlewareResponse.js'

describe('MiddlewareResponse', () => {
  test('constructor', () => {
    const res = new MiddlewareResponse('Bazinga', {
      headers: {
        beep: 'boop',
        computer: 'says no',
      },
      status: 418,
    }).toResponse()

    expect(res.headers.get('beep')).toStrictEqual('boop')
    expect(res.headers.get('computer')).toStrictEqual('says no')
    expect(res.status).toStrictEqual(418)
  })

  test('Can build a Web API Response object', () => {
    const res = new MiddlewareResponse().toResponse()
    expect(res instanceof PonyfillResponse).toBe(true)
    expect(res.status).toStrictEqual(200)
    expect(res.ok).toStrictEqual(true)
  })

  test('Can attach headers to response', () => {
    const mwRes = MiddlewareResponse.next()
    mwRes.headers.set('X-Custom-Header', 'sweet')
    mwRes.headers.append('Other-header', 'sweeter')

    const builtResponse = mwRes.toResponse()

    expect(builtResponse.headers.get('X-Custom-Header')).toStrictEqual('sweet')
    expect(builtResponse.headers.get('Other-header')).toStrictEqual('sweeter')
  })

  test('Can attach a cookie with CookieJar', () => {
    const mwRes = new MiddlewareResponse()
    mwRes.cookies.set('token', 'hunter2', {
      domain: 'redwoodjs.com',
      path: '/',
      httpOnly: true,
    })

    mwRes.cookies.set('monster', 'nomnomnom', {
      domain: 'redwoodjs.com',
    })

    const builtResponse = mwRes.toResponse()

    expect(builtResponse.headers.getSetCookie()).toStrictEqual([
      'token=hunter2; Domain=redwoodjs.com; Path=/; HttpOnly',
      'monster=nomnomnom; Domain=redwoodjs.com',
    ])
  })

  test('Constructs temporary redirects correctly', () => {
    const tempRedirect = MiddlewareResponse.redirect('/somewhere')
    expect(tempRedirect.isRedirect()).toStrictEqual(true)
    expect(tempRedirect.toResponse().status).toStrictEqual(302)
    expect(tempRedirect.toResponse().headers.get('location')).toStrictEqual(
      '/somewhere',
    )
  })

  test('Constructs permanent redirects correctly', () => {
    const permRedirect = MiddlewareResponse.redirect('/bye', 'permanent')
    expect(permRedirect.isRedirect()).toStrictEqual(true)
    expect(permRedirect.toResponse().status).toStrictEqual(301)
    expect(permRedirect.toResponse().headers.get('location')).toStrictEqual(
      '/bye',
    )
  })

  test('Constructs short-circuits correctly when parameters passed to it', async () => {
    const myMwResponse = new MiddlewareResponse()

    try {
      myMwResponse.shortCircuit(JSON.stringify({ shortCircuit: true }), {
        status: 401,
      })
    } catch (e) {
      const shortCircuitError = e as MiddlewareShortCircuit
      expect(shortCircuitError instanceof MiddlewareShortCircuit).toBe(true)
      expect(shortCircuitError.mwResponse.toResponse().status).toStrictEqual(
        401,
      )
      expect(
        await shortCircuitError.mwResponse.toResponse().json(),
      ).toStrictEqual({
        shortCircuit: true,
      })
    }

    expect.assertions(3)
  })

  test('Constructs short-circuits using existing response properties when parameters passed to it', async () => {
    const myMwResponse = new MiddlewareResponse('Nope', {
      status: 429,
      statusText: 'Hold your horses!',
    })

    try {
      myMwResponse.shortCircuit()
    } catch (e) {
      const shortCircuitError = e as MiddlewareShortCircuit
      expect(shortCircuitError instanceof MiddlewareShortCircuit).toBe(true)
      expect(shortCircuitError.mwResponse.toResponse().status).toStrictEqual(
        429,
      )
      expect(
        await shortCircuitError.mwResponse.toResponse().text(),
      ).toStrictEqual('Nope')

      expect(
        shortCircuitError.mwResponse.toResponse().statusText,
      ).toStrictEqual('Hold your horses!')
    }

    expect.assertions(4)
  })
})
