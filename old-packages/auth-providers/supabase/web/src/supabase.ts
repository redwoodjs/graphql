import { DEFAULT_COOKIE_OPTIONS as DEFAULT_SUPABASE_COOKIE_OPTIONS } from '@supabase/ssr'
import { serialize } from '@supabase/ssr'
import type {
  SupabaseClient,
  AuthResponse,
  OAuthResponse,
  SSOResponse,
  SignInWithOAuthCredentials,
  SignInWithIdTokenCredentials,
  SignInWithPasswordCredentials,
  SignInWithPasswordlessCredentials,
  SignInWithSSO,
  SignUpWithPasswordCredentials,
  AuthTokenResponse,
  AuthOtpResponse,
} from '@supabase/supabase-js'
import { AuthError } from '@supabase/supabase-js'

import type { CurrentUser, CustomProviderHooks } from '@redwoodjs/auth'
import {
  createAuthentication,
  getCurrentUserFromMiddleware,
} from '@redwoodjs/auth'

export type SignInWithOAuthOptions = SignInWithOAuthCredentials & {
  authMethod: 'oauth'
}

export type SignInWithIdTokenOptions = SignInWithIdTokenCredentials & {
  authMethod: 'id_token'
}

export type SignInWithPasswordOptions = SignInWithPasswordCredentials & {
  authMethod: 'password'
}

export type SignInWithPasswordlessOptions =
  SignInWithPasswordlessCredentials & {
    authMethod: 'otp'
  }

export type SignInWithSSOOptions = SignInWithSSO & {
  authMethod: 'sso'
}

function createMiddlewareAuth(
  supabaseClient: SupabaseClient,
  customProviderHooks?: CustomProviderHooks,
) {
  const authImplementation = createAuthImplementation({
    supabaseClient,
    middleware: true,
  })

  return createAuthentication(authImplementation, {
    ...customProviderHooks,
    useCurrentUser:
      customProviderHooks?.useCurrentUser ??
      (() => getCurrentUserFromMiddleware('/middleware/supabase')),
  })
}

export function createAuth(
  supabaseClient: SupabaseClient,
  customProviderHooks?: {
    useCurrentUser?: () => Promise<CurrentUser>
    useHasRole?: (
      currentUser: CurrentUser | null,
    ) => (rolesToCheck: string | string[]) => boolean
  },
) {
  if (RWJS_ENV.RWJS_EXP_STREAMING_SSR) {
    return createMiddlewareAuth(supabaseClient, customProviderHooks)
  }

  const authImplementation = createAuthImplementation({ supabaseClient })

  return createAuthentication(authImplementation, customProviderHooks)
}

// Used to set the auth-provider cookie
const setAuthProviderCookie = () => {
  const authProviderCookieString = serialize(
    'auth-provider',
    'supabase',
    DEFAULT_SUPABASE_COOKIE_OPTIONS,
  )

  document.cookie = authProviderCookieString
}

const expireAuthProviderCookie = () => {
  const authProviderCookieString = serialize('auth-provider', 'supabase', {
    ...DEFAULT_SUPABASE_COOKIE_OPTIONS,
    maxAge: -1,
  })

  document.cookie = authProviderCookieString
}

function createAuthImplementation({
  supabaseClient,
  middleware = false,
}: {
  supabaseClient: SupabaseClient
  middleware?: boolean
}) {
  return {
    type: 'supabase',
    client: supabaseClient,
    /*
     * All Supabase Sign In Authentication Methods
     */
    login: async (
      credentials:
        | SignInWithPasswordOptions
        | SignInWithOAuthOptions
        | SignInWithIdTokenOptions
        | SignInWithPasswordlessOptions
        | SignInWithSSOOptions,
    ): Promise<AuthResponse | OAuthResponse | SSOResponse> => {
      let result:
        | AuthTokenResponse
        | AuthOtpResponse
        | OAuthResponse
        | SSOResponse

      switch (credentials.authMethod) {
        /**
         * Log in an existing user with an email and password or phone and password.
         *
         * Be aware that you may get back an error message that will not distinguish
         * between the cases where the account does not exist or that the
         * email/phone and password combination is wrong or that the account can only
         * be accessed via social login.
         */
        case 'password':
          result = await supabaseClient.auth.signInWithPassword(credentials)
          break
        /**
         * Log in an existing user via a third-party provider.
         */
        case 'oauth':
          result = await supabaseClient.auth.signInWithOAuth(credentials)
          break
        /**
         * Log in a user using magiclink or a one-time password (OTP).
         *
         * If the `{{ .ConfirmationURL }}` variable is specified in the email template, a magiclink will be sent.
         * If the `{{ .Token }}` variable is specified in the email template, an OTP will be sent.
         * If you're using phone sign-ins, only an OTP will be sent. You won't be able to send a magiclink for phone sign-ins.
         *
         * Be aware that you may get back an error message that will not distinguish
         * between the cases where the account does not exist or, that the account
         * can only be accessed via social login.
         */
        case 'otp':
          result = await supabaseClient.auth.signInWithOtp(credentials)
          break

        /**
         * Attempts a single-sign on using an enterprise Identity Provider. A
         * successful SSO attempt will redirect the current page to the identity
         * provider authorization page. The redirect URL is implementation and SSO
         * protocol specific.
         *
         * You can use it by providing a SSO domain. Typically you can extract this
         * domain by asking users for their email address. If this domain is
         * registered on the Auth instance the redirect will use that organization's
         * currently active SSO Identity Provider for the login.
         *
         * If you have built an organization-specific login page, you can use the
         * organization's SSO Identity Provider UUID directly instead.
         *
         * This API is experimental and availability is conditional on correct
         * settings on the Auth service.
         *
         * @experimental
         */
        case 'sso':
          result = await supabaseClient.auth.signInWithSSO(credentials)
          break
        /**
         * Allows signing in with an ID token issued by certain supported providers.
         * The ID token is verified for validity and a new session is established.
         *
         * @experimental
         */
        case 'id_token':
          result = await supabaseClient.auth.signInWithIdToken(credentials)

          break
        default:
          return {
            data: { user: null, session: null },
            error: new AuthError('Unsupported authentication method'),
          }
      }

      if (middleware) {
        setAuthProviderCookie()
      }

      return result
    },
    /**
     * Inside a browser context, `signOut()` will remove the logged in user from the browser session
     * and log them out - removing all items from localStorage and then trigger a `"SIGNED_OUT"` event.
     *
     * For server-side management, you can revoke all refresh tokens for a user by passing a user's JWT through to `auth.api.signOut(JWT: string)`.
     * There is no way to revoke a user's access token jwt until it expires. It is recommended to set a shorter expiry on the jwt for this reason.
     */
    logout: async () => {
      const { error } = await supabaseClient.auth.signOut()
      if (error) {
        console.error(error)
      }

      if (middleware) {
        expireAuthProviderCookie()
      }

      return
    },
    /**
     * Creates a new user.
     *
     * Be aware that if a user account exists in the system you may get back an
     * error message that attempts to hide this information from the user.
     *
     * @returns A logged-in session if the server has "autoconfirm" ON
     * @returns A user if the server has "autoconfirm" OFF
     */
    signup: async (
      credentials: SignUpWithPasswordCredentials,
    ): Promise<AuthResponse> => {
      const result = await supabaseClient.auth.signUp(credentials)
      if (result.data?.session) {
        setAuthProviderCookie()
      }
      return result
    },
    getToken: async (): Promise<string | null> => {
      const { data, error } = await supabaseClient.auth.getSession()

      if (error) {
        console.error(error)
        return null
      }

      return data?.session?.access_token ?? null
    },
    /**
     * Gets the current user metadata if there is an existing session.
     */
    getUserMetadata: async () => {
      const { data, error } = await supabaseClient.auth.getSession()

      if (error) {
        console.error(error)
        return null
      }

      return data?.session?.user?.user_metadata ?? null
    },
    /**
     * Restore Redwood authentication state when an OAuth or magiclink
     * callback redirects back to site with access token
     * by restoring the Supabase auth session.
     *
     * Initializes the Supabase client session either from the url or from storage.
     * This method is automatically called when instantiating the client, but should also be called
     * manually when checking for an error from an auth redirect (oauth, magiclink, password recovery, etc).
     */
    restoreAuthState: async () => {
      try {
        const { data } = await supabaseClient.auth.refreshSession()

        if (middleware) {
          if (data.session) {
            setAuthProviderCookie()
          } else {
            expireAuthProviderCookie()
          }
        }

        // Clean up OAuth callback parameters while preserving other search params
        const currentUrl = new URL(window.location.href)
        const authParams = [
          'access_token',
          'refresh_token',
          'token_type',
          'expires_in',
          'expires_at',
        ]

        let hasAuthParams = false

        // Remove only Supabase auth-related parameters
        authParams.forEach((param) => {
          if (currentUrl.searchParams.has(param)) {
            currentUrl.searchParams.delete(param)
            hasAuthParams = true
          }
        })

        // Only modify URL if we actually removed auth parameters
        if (hasAuthParams) {
          const cleanUrl = currentUrl.pathname + (currentUrl.search || '')
          window.history.replaceState({}, document.title, cleanUrl)
        }
      } catch (error) {
        console.error(error)
      }

      return
    },
    // This is important, so we can skip fetching getCurrentUser
    useMiddlewareAuth: middleware,
  }
}
