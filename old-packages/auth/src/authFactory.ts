import type { CurrentUser } from './AuthContext.js'
import { createAuthContext } from './AuthContext.js'
import type { AuthImplementation } from './AuthImplementation.js'
import { createAuthProvider } from './AuthProvider/AuthProvider.js'
import { createUseAuth } from './useAuth.js'

export type CustomProviderHooks = {
  useCurrentUser?: () => Promise<CurrentUser>
  useHasRole?: (
    currentUser: CurrentUser | null,
  ) => (rolesToCheck: string | string[]) => boolean
}

export function createAuthentication<
  TUser,
  TRestoreAuth,
  TLogInOptions,
  TLogIn,
  TLogOutOptions,
  TLogOut,
  TSignUpOptions,
  TSignUp,
  TForgotPassword,
  TResetPasswordOptions,
  TResetPassword,
  TValidateResetToken,
  TClient,
>(
  authImplementation: AuthImplementation<
    TUser,
    TRestoreAuth,
    TLogInOptions,
    TLogIn,
    TLogOutOptions,
    TLogOut,
    TSignUpOptions,
    TSignUp,
    TForgotPassword,
    TResetPasswordOptions,
    TResetPassword,
    TValidateResetToken,
    TClient
  >,
  customProviderHooks?: {
    useCurrentUser?: () => Promise<CurrentUser>
    useHasRole?: (
      currentUser: CurrentUser | null,
    ) => (rolesToCheck: string | string[]) => boolean
  },
) {
  const AuthContext = createAuthContext<
    TUser,
    TLogInOptions,
    TLogIn,
    TLogOutOptions,
    TLogOut,
    TSignUpOptions,
    TSignUp,
    TForgotPassword,
    TResetPasswordOptions,
    TResetPassword,
    TValidateResetToken,
    TClient
  >()
  const useAuth = createUseAuth(AuthContext)
  const AuthProvider = createAuthProvider(
    AuthContext,
    authImplementation,
    customProviderHooks,
  )

  return { AuthContext, AuthProvider, useAuth }
}
