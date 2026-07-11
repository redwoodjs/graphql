import { useCallback } from 'react'

import type { AuthImplementation } from '../AuthImplementation.js'

import type { AuthProviderState } from './AuthProviderState.js'

export const useLogOut = <
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
) => {
  return useCallback(
    async (options?: TLogOutOptions) => {
      const logoutOutput = await authImplementation.logout(options)

      setAuthProviderState({
        userMetadata: null,
        currentUser: null,
        isAuthenticated: false,
        hasError: false,
        error: undefined,
        loading: false,
      })

      return logoutOutput
    },
    [authImplementation, setAuthProviderState],
  )
}
