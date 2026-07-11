import type * as NetlifyIdentityNS from 'netlify-identity-widget'

import type { CurrentUser } from '@redwoodjs/auth'
import { createAuthentication } from '@redwoodjs/auth'

// TODO:
// In the future, when this is a separate package, we can import the full thing
// here (not just the type), and save the user from doing that in their own
// code
// import netlifyIdentity from 'netlify-identity-widget'

type NetlifyIdentity = typeof NetlifyIdentityNS

export function createAuth(
  netlifyIdentity: NetlifyIdentity,
  customProviderHooks?: {
    useCurrentUser?: () => Promise<CurrentUser>
    useHasRole?: (
      currentUser: CurrentUser | null,
    ) => (rolesToCheck: string | string[]) => boolean
  },
) {
  const authImplementation = createAuthImplementation(netlifyIdentity)

  // TODO: Add this when this is a separate package. For now it'll have to be
  // done in the user's app
  // isBrowser && netlifyIdentity.init()

  return createAuthentication(authImplementation, customProviderHooks)
}

function createAuthImplementation(netlifyIdentity: NetlifyIdentity) {
  return {
    type: 'netlify',
    client: netlifyIdentity,
    // `_options: never` is needed to help TS infer the TLogInOptions type
    login: (_options: never) => {
      return new Promise<NetlifyIdentityNS.User | null>((resolve, reject) => {
        let autoClosedModal = false
        netlifyIdentity.open('login')
        netlifyIdentity.on('login', (user) => {
          // This closes the modal which pops-up immediately after you login.
          autoClosedModal = true
          netlifyIdentity.close()
          return resolve(user)
        })
        netlifyIdentity.on('close', () => {
          if (!autoClosedModal) {
            resolve(null)
          }
        })
        netlifyIdentity.on('error', reject)
      })
    },
    logout: (_options: never) => {
      return new Promise<void>((resolve, reject) => {
        netlifyIdentity.logout()
        netlifyIdentity.on('logout', resolve)
        netlifyIdentity.on('error', reject)
      })
    },
    signup: (_options: never) => {
      return new Promise<null>((resolve, reject) => {
        netlifyIdentity.open('signup')
        netlifyIdentity.on('close', () => {
          resolve(null)
        })
        netlifyIdentity.on('error', reject)
      })
    },
    getToken: async () => {
      try {
        // The client refresh function only actually refreshes token
        // when it's been expired. Don't panic
        await netlifyIdentity.refresh()
        const user = netlifyIdentity.currentUser()
        return user?.token?.access_token || null
      } catch {
        return null
      }
    },
    getUserMetadata: async () => {
      return netlifyIdentity.currentUser()
    },
    restoreAuthState: async () => {
      return netlifyIdentity.currentUser()
    },
  }
}
