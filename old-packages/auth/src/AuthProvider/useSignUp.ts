import { useCallback } from 'react'

import type { AuthImplementation } from '../AuthImplementation.js'

import type { AuthProviderState } from './AuthProviderState.js'
import type { useCurrentUser } from './useCurrentUser.js'
import { useReauthenticate } from './useReauthenticate.js'

export const useSignUp = <
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
  setAuthProviderState: React.Dispatch<
    React.SetStateAction<AuthProviderState<TUser>>
  >,
  getCurrentUser: ReturnType<typeof useCurrentUser>,
) => {
  const reauthenticate = useReauthenticate(
    authImplementation,
    setAuthProviderState,
    getCurrentUser,
  )

  return useCallback(
    async (options?: TSignUpOptions) => {
      const signupOutput = await authImplementation.signup(options)
      await reauthenticate()
      return signupOutput
    },
    [authImplementation, reauthenticate],
  )
}
