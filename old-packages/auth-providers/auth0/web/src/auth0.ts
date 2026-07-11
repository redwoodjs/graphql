import type {
  Auth0Client,
  LogoutOptions,
  RedirectLoginOptions,
} from '@auth0/auth0-spa-js'

import type { CurrentUser } from '@redwoodjs/auth'
import { createAuthentication } from '@redwoodjs/auth'

// TODO: Map out this user properly.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Auth0User {}

export function createAuth(
  auth0Client: Auth0Client,
  customProviderHooks?: {
    useCurrentUser?: () => Promise<CurrentUser>
    useHasRole?: (
      currentUser: CurrentUser | null,
    ) => (rolesToCheck: string | string[]) => boolean
  },
) {
  const authImplementation = createAuthImplementation(auth0Client)

  return createAuthentication(authImplementation, customProviderHooks)
}

function createAuthImplementation(auth0Client: Auth0Client) {
  return {
    type: 'auth0',
    client: auth0Client,
    restoreAuthState: async () => {
      if (
        globalThis?.location?.search?.includes('code=') &&
        globalThis?.location?.search?.includes('state=')
      ) {
        const { appState } = await auth0Client.handleRedirectCallback()
        const url = appState?.targetUrl
          ? appState.targetUrl
          : window.location.pathname
        globalThis?.location?.assign(url)
      }
    },
    login: async (options?: RedirectLoginOptions) =>
      auth0Client.loginWithRedirect(options),
    logout: async (options?: LogoutOptions) => auth0Client.logout(options),
    signup: async (options?: RedirectLoginOptions) =>
      auth0Client.loginWithRedirect({
        ...options,
        authorizationParams: {
          screen_hint: 'signup',
          prompt: 'login',
        },
      }),
    getToken: () => auth0Client.getTokenSilently(),
    getUserMetadata: async () => {
      const user = await auth0Client.getUser()
      return user || null
    },
  }
}
