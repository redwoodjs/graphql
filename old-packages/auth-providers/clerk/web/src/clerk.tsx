import type {
  SignInProps,
  SignUpProps,
  SignOutCallback,
  Clerk as ClerkClient,
  GetTokenOptions,
  SignOutOptions,
} from '@clerk/types'

import type { CurrentUser } from '@redwoodjs/auth'
import { createAuthentication } from '@redwoodjs/auth'

type Clerk = ClerkClient | undefined | null

type AuthImplementationOptions = {
  defaultGetTokenOptions?: GetTokenOptions
}

export function createAuth(
  customProviderHooks?: {
    useCurrentUser?: () => Promise<CurrentUser>
    useHasRole?: (
      currentUser: CurrentUser | null,
    ) => (rolesToCheck: string | string[]) => boolean
  },
  authImplementationOptions?: AuthImplementationOptions,
) {
  const authImplementation = createAuthImplementation(authImplementationOptions)

  return createAuthentication(authImplementation, customProviderHooks)
}

function createAuthImplementation({
  defaultGetTokenOptions = {},
}: AuthImplementationOptions = {}) {
  return {
    type: 'clerk',
    // Using a getter here to make sure we're always returning a fresh value
    // and not creating a closure around an old (probably `undefined`) value
    // for Clerk that'll we always return, even when Clerk on the window object
    // eventually refreshes
    get client(): Clerk | undefined {
      return typeof window === 'undefined' ? undefined : (window as any).Clerk
    },
    login: async (options?: SignInProps) => {
      const clerk = (window as any).Clerk as Clerk
      clerk?.openSignIn(options || {})
    },
    logout: async (
      callbackOrOptions?: SignOutCallback | SignOutOptions,
      options?: SignOutOptions,
    ) => {
      const clerk = (window as any).Clerk as Clerk
      return clerk?.signOut(callbackOrOptions as any, options)
    },
    signup: async (options?: SignUpProps) => {
      const clerk = (window as any).Clerk as Clerk
      clerk?.openSignUp(options || {})
    },
    getToken: async (options?: GetTokenOptions) => {
      const clerk = (window as any).Clerk as Clerk

      let token

      try {
        token = await clerk?.session?.getToken({
          ...defaultGetTokenOptions,
          ...options,
        })
      } catch {
        token = null
      }

      return token || null
    },
    getUserMetadata: async () => {
      const clerk = (window as any).Clerk as Clerk
      return clerk?.user
    },
    clientHasLoaded: () => {
      return (window as any).Clerk !== undefined
    },
    loadWhileReauthenticating: true,
  }
}
