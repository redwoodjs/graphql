import type {
  EndSessionRequest,
  PublicClientApplication as AzureActiveDirectoryClient,
  RedirectRequest,
  SilentRequest,
} from '@azure/msal-browser'
import { InteractionRequiredAuthError } from '@azure/msal-browser'

import type { CurrentUser } from '@redwoodjs/auth'
import { createAuthentication } from '@redwoodjs/auth'

export function createAuth(
  azureActiveDirectoryClient: AzureActiveDirectoryClient,
  customProviderHooks?: {
    useCurrentUser?: () => Promise<CurrentUser>
    useHasRole?: (
      currentUser: CurrentUser | null,
    ) => (rolesToCheck: string | string[]) => boolean
  },
) {
  const authImplementation = createAuthImplementation(
    azureActiveDirectoryClient,
  )

  return createAuthentication(authImplementation, customProviderHooks)
}

function createAuthImplementation(
  azureActiveDirectoryClient: AzureActiveDirectoryClient,
) {
  return {
    type: 'azureActiveDirectory',
    client: azureActiveDirectoryClient,
    login: async (options?: RedirectRequest) =>
      azureActiveDirectoryClient.loginRedirect(options),
    logout: (options?: EndSessionRequest) =>
      azureActiveDirectoryClient.logoutRedirect(options),
    signup: async (options?: RedirectRequest) =>
      azureActiveDirectoryClient.loginRedirect(options),
    getToken: async (options?: SilentRequest) => {
      // Default scopes if options is not passed
      const request = options || {
        scopes: ['openid', 'profile'],
      }

      // The recommended call pattern is to first try to call
      // acquireTokenSilent, and if it fails with an
      // InteractionRequiredAuthError, call acquireTokenRedirect
      // https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/acquire-token.md
      try {
        const token =
          await azureActiveDirectoryClient.acquireTokenSilent(request)
        return token.idToken
      } catch (error) {
        if (error instanceof InteractionRequiredAuthError) {
          azureActiveDirectoryClient.acquireTokenRedirect(request)
        }
      }

      return null
    },
    getUserMetadata: async () => {
      return azureActiveDirectoryClient.getActiveAccount()
    },
    restoreAuthState: async () => {
      // As we are using the redirect flow, we need to call and wait for
      // handleRedirectPromise to complete.
      // This should only happen on a valid redirect, and having it in the
      // restoreAuthState makes sense for now.
      // https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/v1-migration.md#3-update-your-code
      await azureActiveDirectoryClient.handleRedirectPromise().then((token) => {
        if (token) {
          // Get accounts
          const accounts = azureActiveDirectoryClient.getAllAccounts()

          switch (accounts.length) {
            case 0:
              // No accounts so we need to login
              azureActiveDirectoryClient.loginRedirect()
              break

            case 1:
              // We have one account so we can set it as active
              azureActiveDirectoryClient.setActiveAccount(accounts[0])
              break

            default:
              // We most likely have multiple accounts so we need to ask the
              // user which one to use
              azureActiveDirectoryClient.loginRedirect()
          }
        }
      })
    },
  }
}
