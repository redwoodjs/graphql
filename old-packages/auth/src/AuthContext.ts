import React from 'react'

export interface CurrentUser {
  [key: string]: unknown
}

export interface AuthContextInterface<
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
  TClient,
> {
  /** Determining your current authentication state */
  loading: boolean
  isAuthenticated: boolean
  /** The current user's data from the `getCurrentUser` function on the api side */
  currentUser: null | CurrentUser
  /**
   * The user's metadata from the auth service provider
   *
   * Exactly what this looks like will depend on the auth service provider,
   * but one example is this
   * ```json
   * {
   *   "id": "11111111-2222-3333-4444-5555555555555",
   *   "aud": "authenticated",
   *   "role": "authenticated",
   *   "email": "email@example.com",
   *   "app_metadata": {
   *     "provider": "email"
   *   },
   *   "user_metadata": null,
   *   "created_at": "2016-05-15T19:53:12.368652374-07:00",
   *   "updated_at": "2016-05-15T19:53:12.368652374-07:00"
   * }
   * ```
   */
  userMetadata: null | TUser
  logIn(options?: TLogInOptions): Promise<TLogIn>
  logOut(options?: TLogOutOptions): Promise<TLogOut>
  signUp(options?: TSignUpOptions): Promise<TSignUp>
  /**
   * Clients should always return null or string
   * It is expected that they catch any errors internally
   */
  getToken(): Promise<null | string>
  /**
   * Fetches the "currentUser" from the api side,
   * but does not update the current user state.
   */
  getCurrentUser(): Promise<null | CurrentUser>
  /**
   * Checks if the "currentUser" from the api side
   * is assigned a role or one of a list of roles.
   * If the user is assigned any of the provided list of roles,
   * the hasRole is considered to be true.
   **/
  hasRole(rolesToCheck: string | string[]): boolean
  /**
   * Redetermine authentication state and update the state.
   */
  reauthenticate(): Promise<void>
  forgotPassword(username: string): Promise<TForgotPassword>
  resetPassword(options?: TResetPasswordOptions): Promise<TResetPassword>
  validateResetToken(resetToken: string | null): Promise<TValidateResetToken>
  /**
   * A reference to auth service provider sdk "client", which is useful if we
   * do not support some specific functionality.
   */
  client?: TClient
  type: string
  hasError: boolean
  error?: Error
}

export function createAuthContext<
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
  TClient,
>() {
  return React.createContext<
    | AuthContextInterface<
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
      >
    | undefined
  >(undefined)
}
