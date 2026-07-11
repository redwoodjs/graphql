import { Request as WhatWgRequest } from '@whatwg-node/fetch'

import { middlewareDefaultAuthProviderState } from '@redwoodjs/auth/dist/AuthProvider/AuthProviderState.js'
import type { ServerAuthState } from '@redwoodjs/auth/dist/AuthProvider/ServerAuthProvider.js'
import { CookieJar } from '@redwoodjs/cookie-jar'

class AuthStateJar {
  private _data: ServerAuthState | null
  private _initialState: ServerAuthState

  constructor(initialState: ServerAuthState) {
    this._data = initialState
    this._initialState = initialState
  }

  /**
   * Always returns the server auth state, even if its set to null,
   * it'll fall back to the initial state (created when mwReq is initialized)
   */
  get() {
    return this._data || this._initialState
  }

  set(value: ServerAuthState | null) {
    this._data = value
  }

  clear() {
    this._data = null
  }
}

export class MiddlewareRequest extends WhatWgRequest {
  cookies: CookieJar
  serverAuthState: AuthStateJar

  constructor(input: Request) {
    super(input)

    const defaultServerAuthState = {
      ...middlewareDefaultAuthProviderState,
      cookieHeader: input.headers.get('Cookie'),
      roles: [],
    }

    this.cookies = new CookieJar(input.headers.get('Cookie'))
    this.serverAuthState = new AuthStateJar(defaultServerAuthState)
  }
}

/**
 * Converts a Web API Request object to a MiddlewareRequest object.
 * Also ensures that serverAuthState is fresh for each request
 * (assuming that it is a new instance for each request)
 */
export const createMiddlewareRequest = (req: Request) => {
  const middlewareRequest = new MiddlewareRequest(req)
  return middlewareRequest
}
