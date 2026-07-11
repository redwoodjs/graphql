import type { FirebaseApp } from 'firebase/app'
import type { CustomParameters, OAuthProvider, User } from 'firebase/auth'
import type FirebaseAuthNamespace from 'firebase/auth'

import type { CurrentUser } from '@redwoodjs/auth'
import { createAuthentication } from '@redwoodjs/auth'

type FirebaseAuth = typeof FirebaseAuthNamespace

// @TODO: Firebase doesn't export a list of providerIds they use
// But I found them here: https://github.com/firebase/firebase-js-sdk/blob/a5768b0aa7d7ce732279931aa436e988c9f36487/packages/rules-unit-testing/src/api/index.ts
// NOTE 10/21/21: Firebase does appear to export a const enum_map of providerIds:
// https://github.com/firebase/firebase-js-sdk/blob/master/packages/auth/src/model/enum_maps.ts#L28-L46
// It may be possible to just use the exported enum map ala https://github.com/redwoodjs/redwood/pull/3537/files#r733851673
export type oAuthProvider =
  | 'google.com'
  | 'facebook.com'
  | 'github.com'
  | 'twitter.com'
  | 'microsoft.com'
  | 'apple.com'

export type anonymousProvider = 'anonymous'
export type customTokenProvider = 'customToken'
export type emailLinkProvider = 'emailLink'

interface Options {
  providerId?:
    | anonymousProvider
    | customTokenProvider
    | emailLinkProvider
    | oAuthProvider
  email?: string
  emailLink?: string
  customToken?: string
  password?: string
  scopes?: string[] // scopes available at https://developers.google.com/identity/protocols/oauth2/scopes
  customParameters?: CustomParameters // parameters available at https://firebase.google.com/docs/reference/js/firebase.auth.GoogleAuthProvider#setcustomparameters
}

interface PasswordOptions {
  email: string
  password: string
}

interface EmailLinkOptions {
  email: string
  emailLink: string
}

const hasPasswordCredentials = (
  options: Options,
): options is PasswordOptions => {
  return options.email !== undefined && options.password !== undefined
}

const isEmailLinkOptions = (options: Options): options is EmailLinkOptions => {
  return (
    options.providerId === 'emailLink' &&
    options.email !== undefined &&
    options.emailLink !== undefined
  )
}

const applyProviderOptions = (
  provider: OAuthProvider,
  options: Options,
): OAuthProvider => {
  if (options.customParameters) {
    provider.setCustomParameters(options.customParameters)
  }
  if (options.scopes) {
    options.scopes.forEach((scope) => provider.addScope(scope))
  }
  return provider
}

export function createAuth(
  firebaseClient: FirebaseClient,
  customProviderHooks?: {
    useCurrentUser?: () => Promise<CurrentUser>
    useHasRole?: (
      currentUser: CurrentUser | null,
    ) => (rolesToCheck: string | string[]) => boolean
  },
) {
  const authImplementation = createAuthImplementation(firebaseClient)

  return createAuthentication(authImplementation, customProviderHooks)
}

export interface FirebaseClient {
  firebaseAuth: FirebaseAuth
  firebaseApp?: FirebaseApp
}

function createAuthImplementation({
  firebaseAuth,
  firebaseApp,
}: FirebaseClient) {
  const auth = firebaseAuth.getAuth(firebaseApp)

  function getProvider(providerId: string) {
    return new firebaseAuth.OAuthProvider(providerId)
  }

  const loginWithEmailLink = ({ email, emailLink }: EmailLinkOptions) => {
    if (firebaseAuth.isSignInWithEmailLink(auth, emailLink)) {
      return firebaseAuth.signInWithEmailLink(auth, email, emailLink)
    }

    return undefined
  }

  return {
    type: 'firebase',
    // TODO: Should we change this to { firebaseAuth, firebaseApp } to match
    // what's created in the user's RW App?
    client: auth,
    restoreAuthState: () => {
      // The first firing of onAuthStateChange indicates that firebase auth has
      // loaded and the state is ready to be read. Unsubscribe after this first firing.
      return new Promise<User | null>((resolve, reject) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
          unsubscribe()
          resolve(user)
        }, reject)
      })
    },
    login: async (
      options: oAuthProvider | Options = { providerId: 'google.com' },
    ) => {
      // If argument provided is a string, it should be the oAuth Provider
      // Cast the provider string into the options object
      if (typeof options === 'string') {
        options = { providerId: options }
      }

      if (hasPasswordCredentials(options)) {
        return firebaseAuth.signInWithEmailAndPassword(
          auth,
          options.email,
          options.password,
        )
      }

      if (isEmailLinkOptions(options)) {
        return loginWithEmailLink(options)
      }

      if (options.providerId === 'anonymous') {
        return firebaseAuth.signInAnonymously(auth)
      }

      if (options.providerId === 'customToken' && options.customToken) {
        return firebaseAuth.signInWithCustomToken(auth, options.customToken)
      }

      const provider = getProvider(options.providerId || 'google.com')
      const providerWithOptions = applyProviderOptions(provider, options)

      return firebaseAuth.signInWithPopup(auth, providerWithOptions)
    },
    logout: () => auth.signOut(),
    signup: async (
      options: oAuthProvider | Options = { providerId: 'google.com' },
    ) => {
      if (typeof options === 'string') {
        options = { providerId: options }
      }

      if (hasPasswordCredentials(options)) {
        return firebaseAuth.createUserWithEmailAndPassword(
          auth,
          options.email,
          options.password,
        )
      }

      if (isEmailLinkOptions(options)) {
        return loginWithEmailLink(options)
      }

      if (options.providerId === 'anonymous') {
        return firebaseAuth.signInAnonymously(auth)
      }

      if (options.providerId === 'customToken' && options.customToken) {
        return firebaseAuth.signInWithCustomToken(auth, options.customToken)
      }

      const provider = getProvider(options.providerId || 'google.com')
      const providerWithOptions = applyProviderOptions(provider, options)

      return firebaseAuth.signInWithPopup(auth, providerWithOptions)
    },
    getToken: async () => {
      return auth.currentUser ? auth.currentUser.getIdToken() : null
    },
    getUserMetadata: async () => {
      return auth.currentUser
    },
  }
}
