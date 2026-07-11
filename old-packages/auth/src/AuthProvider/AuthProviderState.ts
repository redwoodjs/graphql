import type { CurrentUser } from '../AuthContext.js'

export type AuthProviderState<TUser, TClient = unknown> = {
  loading: boolean
  isAuthenticated: boolean
  userMetadata: null | TUser
  currentUser: null | CurrentUser
  hasError: boolean
  error?: Error
  client?: TClient
}

export const spaDefaultAuthProviderState: AuthProviderState<never> = {
  loading: true,
  isAuthenticated: false,
  userMetadata: null,
  currentUser: null,
  hasError: false,
}

export const middlewareDefaultAuthProviderState: AuthProviderState<never> = {
  loading: false,
  isAuthenticated: false,
  userMetadata: null,
  currentUser: null,
  hasError: false,
}
