import { useCallback } from 'react'

import type { AuthImplementation } from '../AuthImplementation.js'

export const useResetPassword = <
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
    async (options?: TResetPasswordOptions) => {
      if (authImplementation.resetPassword) {
        return await authImplementation.resetPassword(options)
      } else {
        throw new Error(
          `Auth client ${authImplementation.type} does not implement this function`,
        )
      }
    },
    [authImplementation],
  )
}
