import { AsyncLocalStorage } from 'async_hooks'

import type { ServerAuthState } from '@redwoodjs/auth/dist/AuthProvider/ServerAuthProvider.js' with { 'resolution-mode': 'import' }
import { CookieJar } from '@redwoodjs/cookie-jar'

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ServerStore extends Map<string, any> {}

let PER_REQ_STORAGE: AsyncLocalStorage<ServerStore>

type InitPerReqMapParams = {
  headers: Headers | Record<string, string>
  fullUrl: string
  serverAuthState?: ServerAuthState
}

export const createServerStorage = () => {
  PER_REQ_STORAGE = new AsyncLocalStorage<ServerStore>()

  return PER_REQ_STORAGE
}

/**
 *
 * This function just creates a Map, that you pass to
 * serverStorage.run(MAP_HERE, () => { ... })
 */
export const createPerRequestMap = ({
  headers,
  fullUrl,
  serverAuthState,
}: InitPerReqMapParams) => {
  const reqStore = new Map()

  const headersObj = new Headers(headers)
  reqStore.set('headers', headersObj)

  reqStore.set('fullUrl', fullUrl)

  if (serverAuthState) {
    reqStore.set('serverAuthState', serverAuthState)
  }

  return reqStore
}

const getStore = () => {
  if (!PER_REQ_STORAGE) {
    throw new Error('Server store not initialized')
  }

  return PER_REQ_STORAGE.getStore()
}

// @TODO add guard rails around Cookies object?
// Because you can't currently modify request headers from a RSC component
export const getRequestCookies = (): CookieJar => {
  const headers = getRequestHeaders()

  return new CookieJar(headers.get('cookie'))
}

// @TODO add guard rails around headers object?
// Because you can't currently modify request headers from a RSC component
export const getRequestHeaders = (): Headers => {
  return getStore()?.get('headers')
}

export const getAuthState = (): ServerAuthState => {
  return getStore()?.get('serverAuthState')
}

export const getLocation = (): URL => {
  return new URL(getStore()?.get('fullUrl'))
}

export const setServerAuthState = (authState: ServerAuthState) => {
  const store = getStore()
  store?.set('serverAuthState', authState)
}
