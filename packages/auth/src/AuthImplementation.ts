export interface AuthImplementation<
  TUser = unknown,
  TRestoreAuth = unknown,
  TLogInOptions = unknown,
  TLogIn = unknown,
  TLogOutOptions = unknown,
  TLogOut = unknown,
  TSignUpOptions = unknown,
  TSignUp = unknown,
  TForgotPassword = unknown,
  TResetPasswordOptions = unknown,
  TResetPassword = unknown,
  TValidateResetToken = unknown,
  TClient = unknown,
> {
  type: string
  client?: TClient

  restoreAuthState?(): Promise<TRestoreAuth>
  login(options?: TLogInOptions): Promise<TLogIn>
  logout(options?: TLogOutOptions): Promise<TLogOut>
  signup(options?: TSignUpOptions): Promise<TSignUp>
  getToken(): Promise<string | null>
  forgotPassword?(username: string): Promise<TForgotPassword>
  resetPassword?(options?: TResetPasswordOptions): Promise<TResetPassword>
  validateResetToken?(token: string | null): Promise<TValidateResetToken>
  clientHasLoaded?(): boolean

  /**
   * The user's data from the AuthProvider
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
  getUserMetadata(): Promise<TUser | null>

  /**
   * Set "loading" to true while the auth provider is reauthenticating.
   */
  loadWhileReauthenticating?: boolean

  /**
   * This property is either manually set by the user, or inferred from the
   * experimental.streamingSsr setting in TOML
   */
  middlewareAuthEnabled?: boolean
  /**
   * This is the endpoint on the middleware we are going to hit for POST
   * requests
   */
  getAuthUrl?: () => string
}
