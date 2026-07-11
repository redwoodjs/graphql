import { useCallback } from 'react'

import type { AuthImplementation } from '../AuthImplementation.js'

export const useValidateResetToken = <
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
    async (resetToken: string | null) => {
      if (authImplementation.validateResetToken) {
        return await authImplementation.validateResetToken(resetToken)
      } else {
        throw new Error(
          `Auth client ${authImplementation.type} does not implement this function`,
        )
      }
    },
    [authImplementation],
  )
}
