import { Response as PonyResponse } from '@whatwg-node/fetch'
import * as cookie from 'cookie'

import { CookieJar } from '@redwoodjs/cookie-jar'

export class MiddlewareShortCircuit extends Error {
  mwResponse: MiddlewareResponse

  constructor(body?: BodyInit | null, responseInit?: ResponseInit) {
    super('Short circuit. Skipping all middleware, and returning early')
    this.name = 'MiddlewareShortCircuit'
    this.mwResponse = new MiddlewareResponse(body, responseInit)
  }
}

/**
 * This is actually a Response builder class
 * After setting all the required properties, we can call `build` to get a Web
 * API Response object
 */
export class MiddlewareResponse {
  cookies = new CookieJar()
  headers = new Headers()
  body: BodyInit | null | undefined
  status = 200
  statusText: string | undefined

  constructor(body?: BodyInit | null, init?: ResponseInit) {
    this.body = body
    this.headers = new Headers(init?.headers)
    this.status = init?.status || 200
    this.statusText = init?.statusText
  }

  static fromResponse = (res: Response) => {
    return new MiddlewareResponse(res.body, {
      headers: res.headers,
      status: res.status,
      statusText: res.statusText,
    })
  }

  /**
   *
   * Short circuit the middleware chain and return early.
   * This will skip all the remaining middleware and return the response immediately.
   *
   * @returns MiddlewareResponse
   */
  shortCircuit = (body?: BodyInit | null, init?: ResponseInit) => {
    for (const [ckName, ckParams] of this.cookies) {
      this.headers.append(
        'Set-Cookie',
        cookie.serialize(ckName, ckParams.value, ckParams.options),
      )
    }

    throw new MiddlewareShortCircuit(
      body || this.body,
      init || {
        headers: this.headers,
        status: this.status,
        statusText: this.statusText,
      },
    )
  }

  /**
   * Skip the current middleware and move to the next one.
   * Careful: It creates a new Response, so any middleware that modifies the
   * response before the current one will be lost.
   * @returns MiddlewareResponse
   */
  static next = () => {
    return new MiddlewareResponse()
  }

  /**
   * Return a MiddlewareResponse object that will redirect the client to the
   * specified location
   *
   * @returns MiddlewareResponse
   */
  static redirect = (
    location: string,
    type: 'permanent' | 'temporary' = 'temporary',
  ) => {
    const res = new MiddlewareResponse()
    res.headers.set('Location', location)
    res.status = type === 'permanent' ? 301 : 302

    return res
  }

  isRedirect = () => {
    return this.status === 301 || this.status === 302
  }

  toResponse = () => {
    for (const [ckName, ckParams] of this.cookies) {
      this.headers.append(
        'Set-Cookie',
        cookie.serialize(ckName, ckParams.value, ckParams.options),
      )
    }

    return new PonyResponse(this.body, {
      headers: this.headers,
      status: this.status,
      statusText: this.statusText,
    })
  }
}
