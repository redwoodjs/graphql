import type SuperTokens from 'supertokens-auth-react'

import type { CurrentUser } from '@redwoodjs/auth'
import { createAuthentication } from '@redwoodjs/auth'

export interface SuperTokensUser {
  userId: string
  accessTokenPayload: any
}

export type SessionRecipe = {
  signOut: () => Promise<void>
  doesSessionExist: () => Promise<boolean>
  getAccessTokenPayloadSecurely: () => Promise<any>
  getAccessToken: () => Promise<any>
  getUserId: () => Promise<string>
}

export function createAuth(
  superTokens: SuperTokensAuth,
  customProviderHooks?: {
    useCurrentUser?: () => Promise<CurrentUser>
    useHasRole?: (
      currentUser: CurrentUser | null,
    ) => (rolesToCheck: string | string[]) => boolean
  },
) {
  const authImplementation = createAuthImplementation(superTokens)

  return createAuthentication(authImplementation, customProviderHooks)
}

export interface SuperTokensAuth {
  sessionRecipe: SessionRecipe
  redirectToAuth: (typeof SuperTokens)['redirectToAuth']
}

function createAuthImplementation(superTokens: SuperTokensAuth) {
  return {
    type: 'supertokens',
    login: () => {
      return superTokens.redirectToAuth({ show: 'signin', redirectBack: true })
    },
    signup: () => {
      return superTokens.redirectToAuth({ show: 'signup', redirectBack: true })
    },
    logout: () => {
      return superTokens.sessionRecipe.signOut()
    },
    getToken: async (): Promise<string | null> => {
      if (await superTokens.sessionRecipe.doesSessionExist()) {
        return superTokens.sessionRecipe.getAccessToken()
      } else {
        return null
      }
    },

    getUserMetadata: async (): Promise<SuperTokensUser | null> => {
      if (await superTokens.sessionRecipe.doesSessionExist()) {
        return {
          userId: await superTokens.sessionRecipe.getUserId(),
          accessTokenPayload:
            await superTokens.sessionRecipe.getAccessTokenPayloadSecurely(),
        }
      } else {
        return null
      }
    },
  }
}
