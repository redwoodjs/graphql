import { useCallback } from 'react'

import type { AuthImplementation } from '../AuthImplementation.js'

export const useForgotPassword = <
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
) => {
  return useCallback(
    async (username: string) => {
      if (authImplementation.forgotPassword) {
        return await authImplementation.forgotPassword(username)
      } else {
        throw new Error(
          `Auth client ${authImplementation.type} does not implement this function`,
        )
      }
    },
    [authImplementation],
  )
}
