import type { PrismaClient } from '@prisma/client'
import type {
  GenerateAuthenticationOptionsOpts,
  GenerateRegistrationOptionsOpts,
  VerifiedAuthenticationResponse,
  VerifiedRegistrationResponse,
  VerifyAuthenticationResponseOpts,
  VerifyRegistrationResponseOpts,
} from '@simplewebauthn/server'
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/typescript-types'
import type { APIGatewayProxyEvent, Context as LambdaContext } from 'aws-lambda'
import base64url from 'base64url'
import md5 from 'md5'
import { v4 as uuidv4 } from 'uuid'

import type { CorsConfig, CorsContext, PartialRequest } from '@redwoodjs/api'
import {
  createCorsContext,
  isFetchApiRequest,
  normalizeRequest,
} from '@redwoodjs/api'

import * as DbAuthError from './errors'
import {
  decryptSession,
  encryptSession,
  extractCookie,
  extractHashingOptions,
  generateCookieName,
  getDbAuthResponseBuilder,
  getSession,
  hashPassword,
  hashToken,
  isLegacySession,
  legacyHashPassword,
  webAuthnSession,
} from './shared'

interface SignupFlowOptions<TUserAttributes = Record<string, unknown>> {
  /**
   * Allow users to sign up. Defaults to true.
   * Needs to be explicitly set to false to disable the flow
   */
  enabled?: boolean
  /**
   * Whatever you want to happen to your data on new user signup. Redwood will
   * check for duplicate usernames before calling this handler. At a minimum
   * you need to save the `username`, `hashedPassword` and `salt` to your
   * user table. `userAttributes` contains any additional object members that
   * were included in the object given to the `signUp()` function you got
   * from `useAuth()`
   */
  handler: (signupHandlerOptions: SignupHandlerOptions<TUserAttributes>) => any

  /**
   * Validate the user-supplied password with whatever logic you want. Return
   * `true` if valid, throw `PasswordValidationError` if not.
   */
  passwordValidation?: (password: string) => boolean

  /**
   * Object containing error strings
   */
  errors?: {
    fieldMissing?: string
    usernameTaken?: string
    flowNotEnabled?: string
  }

  /**
   * Allows the user to define if the UserCheck for their selected db provider should use case insensitive
   */
  usernameMatch?: string
}

interface ForgotPasswordFlowOptions<TUser = UserType> {
  /**
   * Allow users to request a new password via a call to forgotPassword. Defaults to true.
   * Needs to be explicitly set to false to disable the flow
   */
  enabled?: boolean
  handler: (user: TUser, token: string) => any
  errors?: {
    usernameNotFound?: string
    usernameRequired?: string
    flowNotEnabled?: string
  }
  expires: number
}

interface LoginFlowOptions<TUser = UserType> {
  /**
   * Allow users to login. Defaults to true.
   * Needs to be explicitly set to false to disable the flow
   */
  enabled?: boolean
  /**
   * Anything you want to happen before logging the user in. This can include
   * throwing an error to prevent login. If you do want to allow login, this
   * function must return an object representing the user you want to be logged
   * in, containing at least an `id` field (whatever named field was provided
   * for `authFields.id`). For example: `return { id: user.id }`
   */
  handler: (user: TUser) => any
  /**
   * Object containing error strings
   */
  errors?: {
    usernameOrPasswordMissing?: string
    usernameNotFound?: string
    incorrectPassword?: string
    flowNotEnabled?: string
  }
  /**
   * How long a user will remain logged in, in seconds
   */
  expires: number

  /**
   * Allows the user to define if the UserCheck for their selected db provider should use case insensitive
   */
  usernameMatch?: string
}

interface ResetPasswordFlowOptions<TUser = UserType> {
  /**
   * Allow users to reset their password via a code from a call to forgotPassword. Defaults to true.
   * Needs to be explicitly set to false to disable the flow
   */
  enabled?: boolean
  handler: (user: TUser) => boolean | Promise<boolean>
  allowReusedPassword: boolean
  errors?: {
    resetTokenExpired?: string
    resetTokenInvalid?: string
    resetTokenRequired?: string
    reusedPassword?: string
    flowNotEnabled?: string
  }
}

interface WebAuthnFlowOptions {
  enabled: boolean
  expires: number
  name: string
  domain: string
  origin: string
  timeout?: number
  type: 'any' | 'platform' | 'cross-platform'
  credentialFields: {
    id: string
    userId: string
    publicKey: string
    transports: string
    counter: string
  }
}

export type UserType = Record<string | number, any>

export type DbAuthResponse = Promise<{
  headers: {
    [x: string]: string | string[]
  }
  body?: string | undefined
  statusCode: number
}>

type AuthMethodOutput = [
  string | Record<string, any> | boolean | undefined, // body
  Headers?,
  { statusCode: number }?,
]

export interface DbAuthHandlerOptions<
  TUser = UserType,
  TUserAttributes = Record<string, unknown>,
> {
  /**
   * Provide prisma db client
   */
  db: PrismaClient
  /**
   * The name of the property you'd call on `db` to access your user table.
   * ie. if your Prisma model is named `User` this value would be `user`, as in `db.user`
   */
  authModelAccessor: keyof PrismaClient
  /**
   * The name of the property you'd call on `db` to access your user credentials table.
   * ie. if your Prisma model is named `UserCredential` this value would be `userCredential`, as in `db.userCredential`
   */
  credentialModelAccessor?: keyof PrismaClient
  /**
   * The fields that are allowed to be returned from the user table when
   * invoking handlers that return a user object (like forgotPassword and signup)
   * Defaults to `id` and `email` if not set at all.
   */
  allowedUserFields?: string[]
  /**
   *  A map of what dbAuth calls a field to what your database calls it.
   * `id` is whatever column you use to uniquely identify a user (probably
   * something like `id` or `userId` or even `email`)
   */
  authFields: {
    id: string
    username: string
    hashedPassword: string
    salt: string
    resetToken: string
    resetTokenExpiresAt: string
    challenge?: string
  }
  /**
   * Object containing cookie config options
   */
  cookie?: {
    /** @deprecated set this option in `cookie.attributes` */
    Path?: string
    /** @deprecated set this option in `cookie.attributes` */
    HttpOnly?: boolean
    /** @deprecated set this option in `cookie.attributes` */
    Secure?: boolean
    /** @deprecated set this option in `cookie.attributes` */
    SameSite?: string
    /** @deprecated set this option in `cookie.attributes` */
    Domain?: string
    attributes?: {
      Path?: string
      HttpOnly?: boolean
      Secure?: boolean
      SameSite?: string
      Domain?: string
    }
    /**
     * The name of the cookie that dbAuth sets
     *
     * %port% will be replaced with the port the api server is running on.
     * If you have multiple RW apps running on the same host, you'll need to
     * make sure they all use unique cookie names
     */
    name?: string
  }
  /**
   * Object containing forgot password options
   */
  forgotPassword: ForgotPasswordFlowOptions<TUser> | { enabled: false }
  /**
   * Object containing login options
   */
  login: LoginFlowOptions<TUser> | { enabled: false }
  /**
   * Object containing reset password options
   */
  resetPassword: ResetPasswordFlowOptions<TUser> | { enabled: false }
  /**
   * Object containing login options
   */
  signup: SignupFlowOptions<TUserAttributes> | { enabled: false }

  /**
   * Object containing WebAuthn options
   */
  webAuthn?: WebAuthnFlowOptions | { enabled: false }

  /**
   * CORS settings, same as in createGraphqlHandler
   */
  cors?: CorsConfig
}

export interface SignupHandlerOptions<TUserAttributes> {
  username: string
  hashedPassword: string
  salt: string
  userAttributes?: TUserAttributes
}

export type AuthMethodNames =
  | 'forgotPassword'
  | 'getToken'
  | 'login'
  | 'logout'
  | 'resetPassword'
  | 'signup'
  | 'webAuthnAuthenticate'
  | 'webAuthnAuthOptions'
  | 'webAuthnRegOptions'
  | 'webAuthnRegister'
  | 'validateResetToken'

type Params = AuthenticationResponseJSON &
  RegistrationResponseJSON & {
    username?: string
    password?: string
    resetToken?: string
    method: AuthMethodNames
    [key: string]: any
  } & {
    transports?: string // used by webAuthN for something
  }

type DbAuthSession<T = unknown> = Record<string, T>
type CorsHeaders = Record<string, string>

const DEFAULT_ALLOWED_USER_FIELDS = ['id', 'email']

export class DbAuthHandler<
  TUser extends UserType,
  TUserAttributes = Record<string, unknown>,
> {
  event: Request | APIGatewayProxyEvent
  _normalizedRequest: PartialRequest<Params> | undefined
  httpMethod: string
  options: DbAuthHandlerOptions<TUser, TUserAttributes>
  cookie: string
  db: PrismaClient
  dbAccessor: any
  dbCredentialAccessor: any
  allowedUserFields: string[]
  hasInvalidSession: boolean
  session: DbAuthSession | undefined
  sessionCsrfToken: string | undefined
  corsContext: CorsContext | undefined
  sessionExpiresDate: string
  webAuthnExpiresDate: string
  encryptedSession: string | null = null
  createResponse: (
    response: {
      body?: string
      statusCode: number
      headers?: Headers
    },
    corsHeaders: CorsHeaders,
  ) => {
    headers: Record<string, string | string[]>
    body?: string | undefined
    statusCode: number
  }

  public get normalizedRequest() {
    if (!this._normalizedRequest) {
      // This is a dev time error, no need to throw a specialized error
      throw new Error(
        'dbAuthHandler has not been initialized. Either await ' +
          'dbAuthHandler.invoke() or call await dbAuth.init()',
      )
    }
    return this._normalizedRequest
  }

  // class constant: list of auth methods that are supported
  static get METHODS(): AuthMethodNames[] {
    return [
      'forgotPassword',
      'getToken',
      'login',
      'logout',
      'resetPassword',
      'signup',
      'validateResetToken',
      'webAuthnRegOptions',
      'webAuthnRegister',
      'webAuthnAuthOptions',
      'webAuthnAuthenticate',
    ]
  }

  // class constant: maps the auth functions to their required HTTP verb for access
  static get VERBS() {
    return {
      forgotPassword: 'POST',
      getToken: 'GET',
      login: 'POST',
      logout: 'POST',
      resetPassword: 'POST',
      signup: 'POST',
      validateResetToken: 'POST',
      webAuthnRegOptions: 'GET',
      webAuthnRegister: 'POST',
      webAuthnAuthOptions: 'GET',
      webAuthnAuthenticate: 'POST',
    }
  }

  // default to epoch when we want to expire
  static get PAST_EXPIRES_DATE() {
    return new Date('1970-01-01T00:00:00.000+00:00').toUTCString()
  }

  // generate a new token (standard UUID)
  static get CSRF_TOKEN() {
    return uuidv4()
  }

  static get AVAILABLE_WEBAUTHN_TRANSPORTS() {
    return ['usb', 'ble', 'nfc', 'internal']
  }

  /**
   * Returns the set-cookie header to mark the cookie as expired ("deletes" the session)
   *
   * The header keys are case insensitive, but Fastify prefers these to be lowercase.
   * Therefore, we want to ensure that the headers are always lowercase and unique
   * for compliance with HTTP/2.
   *
   * @see: https://www.rfc-editor.org/rfc/rfc7540#section-8.1.2
   */
  get _deleteSessionHeader(): Headers {
    const deleteHeaders = new Headers()

    deleteHeaders.append(
      'set-cookie',
      [
        `${generateCookieName(this.options.cookie?.name)}=`,
        ...this._cookieAttributes({ expires: 'now' }),
      ].join(';'),
    )

    deleteHeaders.append(
      'set-cookie',
      [`auth-provider=`, ...this._cookieAttributes({ expires: 'now' })].join(
        ';',
      ),
    )

    return deleteHeaders
  }

  constructor(
    event: APIGatewayProxyEvent | Request,
    _context: LambdaContext, // @TODO:
    options: DbAuthHandlerOptions<TUser, TUserAttributes>,
  ) {
    this.options = options
    this.event = event
    this.httpMethod = isFetchApiRequest(event) ? event.method : event.httpMethod

    this.cookie = extractCookie(event) || ''

    this.createResponse = getDbAuthResponseBuilder(event)

    this._validateOptions()

    this.db = this.options.db
    this.dbAccessor = this.db[this.options.authModelAccessor]
    this.dbCredentialAccessor = this.options.credentialModelAccessor
      ? this.db[this.options.credentialModelAccessor]
      : null
    this.hasInvalidSession = false
    this.allowedUserFields =
      this.options.allowedUserFields || DEFAULT_ALLOWED_USER_FIELDS

    const sessionExpiresAt = new Date()
    sessionExpiresAt.setSeconds(
      sessionExpiresAt.getSeconds() +
        (this.options.login as LoginFlowOptions).expires,
    )
    this.sessionExpiresDate = sessionExpiresAt.toUTCString()

    const webAuthnExpiresAt = new Date()
    webAuthnExpiresAt.setSeconds(
      webAuthnExpiresAt.getSeconds() +
        ((this.options?.webAuthn as WebAuthnFlowOptions)?.expires || 0),
    )
    this.webAuthnExpiresDate = webAuthnExpiresAt.toUTCString()

    // Note that we handle these headers differently in functions/graphql.ts
    // because it's handled by graphql-yoga, so we map the cors config to yoga config
    // See packages/graphql-server/src/__tests__/mapRwCorsToYoga.test.ts
    if (options.cors) {
      this.corsContext = createCorsContext(options.cors)
    }

    try {
      this.encryptedSession = getSession(this.cookie, this.options.cookie?.name)

      const [session, csrfToken] = decryptSession(this.encryptedSession)
      this.session = session
      this.sessionCsrfToken = csrfToken
    } catch (e) {
      // if session can't be decrypted, keep track so we can log them out when
      // the auth method is called
      if (e instanceof DbAuthError.SessionDecryptionError) {
        this.hasInvalidSession = true
      } else {
        throw e
      }
    }
  }

  // Initialize the request object. This is async now, because body in Fetch Request
  // is parsed async
  async init() {
    if (!this._normalizedRequest) {
      this._normalizedRequest = (await normalizeRequest(
        this.event,
      )) as PartialRequest<Params>
    }
  }

  // Actual function that triggers everything else to happen: `login`, `signup`,
  // etc. is called from here, after some checks to make sure the request is good
  async invoke() {
    let corsHeaders = {}
    await this.init()
    if (this.corsContext) {
      corsHeaders = this.corsContext.getRequestHeaders(this.normalizedRequest)
      // Return CORS headers for OPTIONS requests
      if (this.corsContext.shouldHandleCors(this.normalizedRequest)) {
        return this.createResponse({ body: '', statusCode: 200 }, corsHeaders)
      }
    }

    // if there was a problem decryption the session, just return the logout
    // response immediately
    if (this.hasInvalidSession) {
      return this.createResponse(
        this._ok(...this._logoutResponse()),
        corsHeaders,
      )
    }

    try {
      const method = await this._getAuthMethod()

      // get the auth method the incoming request is trying to call
      if (!DbAuthHandler.METHODS.includes(method)) {
        return this.createResponse(this._notFound(), corsHeaders)
      }

      // make sure it's using the correct verb, GET vs POST
      if (this.httpMethod !== DbAuthHandler.VERBS[method]) {
        return this.createResponse(this._notFound(), corsHeaders)
      }

      // call whatever auth method was requested and return the body and headers
      const [body, headers, options = { statusCode: 200 }] =
        await this[method]()

      return this.createResponse(this._ok(body, headers, options), corsHeaders)
    } catch (e: any) {
      if (e instanceof DbAuthError.WrongVerbError) {
        return this.createResponse(this._notFound(), corsHeaders)
      } else {
        return this.createResponse(
          this._badRequest(e.message || e),
          corsHeaders,
        )
      }
    }
  }

  async forgotPassword(): Promise<AuthMethodOutput> {
    const { enabled = true } = this.options.forgotPassword

    if (!enabled) {
      throw new DbAuthError.FlowNotEnabledError(
        (this.options.forgotPassword as ForgotPasswordFlowOptions)?.errors
          ?.flowNotEnabled || `Forgot password flow is not enabled`,
      )
    }

    const { username } = this.normalizedRequest.jsonBody || {}
    // was the username sent in at all?
    if (!username || username.trim() === '') {
      throw new DbAuthError.UsernameRequiredError(
        (this.options.forgotPassword as ForgotPasswordFlowOptions)?.errors
          ?.usernameRequired || `Username is required`,
      )
    }
    let user

    try {
      user = await this.dbAccessor.findUnique({
        where: { [this.options.authFields.username]: username },
      })
    } catch {
      throw new DbAuthError.GenericError()
    }

    if (user) {
      const tokenExpires = new Date()
      tokenExpires.setSeconds(
        tokenExpires.getSeconds() +
          (this.options.forgotPassword as ForgotPasswordFlowOptions).expires,
      )

      // generate a token
      let token = md5(uuidv4())
      const buffer = Buffer.from(token)
      token = buffer.toString('base64').replace('=', '').substring(0, 16)

      // Store the token hash in the database so we can verify it later
      const tokenHash = hashToken(token)

      try {
        // set token and expires time
        user = await this.dbAccessor.update({
          where: {
            [this.options.authFields.id]: user[this.options.authFields.id],
          },
          data: {
            [this.options.authFields.resetToken]: tokenHash,
            [this.options.authFields.resetTokenExpiresAt]: tokenExpires,
          },
        })
      } catch {
        throw new DbAuthError.GenericError()
      }

      // call user-defined handler in their functions/auth.js
      const response = await (
        this.options.forgotPassword as ForgotPasswordFlowOptions
      ).handler(this._sanitizeUser(user), token)

      return [
        response ? JSON.stringify(response) : '',
        this._deleteSessionHeader,
      ]
    } else {
      throw new DbAuthError.UsernameNotFoundError(
        (this.options.forgotPassword as ForgotPasswordFlowOptions)?.errors
          ?.usernameNotFound || `Username '${username} not found`,
      )
    }
  }

  async getToken(): Promise<AuthMethodOutput> {
    try {
      const user = await this._getCurrentUser()
      let headers = new Headers()

      // if the session was encrypted with the old algorithm, re-encrypt it
      // with the new one
      if (isLegacySession(this.cookie)) {
        headers = this._loginResponse(user)[1]
      }

      return [user[this.options.authFields.id], headers]
    } catch (e: any) {
      if (e instanceof DbAuthError.NotLoggedInError) {
        return this._logoutResponse()
      } else {
        return this._logoutResponse({ error: e.message })
      }
    }
  }

  async login(): Promise<AuthMethodOutput> {
    const { enabled = true } = this.options.login

    if (!enabled) {
      throw new DbAuthError.FlowNotEnabledError(
        (this.options.login as LoginFlowOptions)?.errors?.flowNotEnabled ||
          `Login flow is not enabled`,
      )
    }

    const { username, password } = this.normalizedRequest.jsonBody || {}
    const dbUser = await this._verifyUser(username, password)
    const handlerUser = await (this.options.login as LoginFlowOptions).handler(
      dbUser,
    )

    if (handlerUser?.[this.options.authFields.id] == null) {
      throw new DbAuthError.NoUserIdError()
    }

    return this._loginResponse(handlerUser)
  }

  logout(): AuthMethodOutput {
    return this._logoutResponse()
  }

  async resetPassword(): Promise<AuthMethodOutput> {
    const { enabled = true } = this.options.resetPassword
    if (!enabled) {
      throw new DbAuthError.FlowNotEnabledError(
        (this.options.resetPassword as ResetPasswordFlowOptions)?.errors
          ?.flowNotEnabled || `Reset password flow is not enabled`,
      )
    }

    const { password, resetToken } = this.normalizedRequest.jsonBody || {}

    // is the resetToken present?
    if (resetToken == null || String(resetToken).trim() === '') {
      throw new DbAuthError.ResetTokenRequiredError(
        (
          this.options.resetPassword as ResetPasswordFlowOptions
        )?.errors?.resetTokenRequired,
      )
    }

    // is password present?
    if (password == null || String(password).trim() === '') {
      throw new DbAuthError.PasswordRequiredError()
    }

    // check if password is valid using signup criteria
    ;(this.options.signup as SignupFlowOptions).passwordValidation?.(password)

    let user = await this._findUserByToken(resetToken)
    const [hashedPassword] = hashPassword(password, {
      salt: user.salt,
    })
    const [legacyHashedPassword] = legacyHashPassword(password, user.salt)

    if (
      (!(this.options.resetPassword as ResetPasswordFlowOptions)
        .allowReusedPassword &&
        user.hashedPassword === hashedPassword) ||
      user.hashedPassword === legacyHashedPassword
    ) {
      throw new DbAuthError.ReusedPasswordError(
        (
          this.options.resetPassword as ResetPasswordFlowOptions
        )?.errors?.reusedPassword,
      )
    }

    try {
      // if we got here then we can update the password in the database
      user = await this.dbAccessor.update({
        where: {
          [this.options.authFields.id]: user[this.options.authFields.id],
        },
        data: {
          [this.options.authFields.hashedPassword]: hashedPassword,
        },
      })
    } catch {
      throw new DbAuthError.GenericError()
    }

    await this._clearResetToken(user)

    // call the user-defined handler so they can decide what to do with this user
    const response = await (
      this.options.resetPassword as ResetPasswordFlowOptions
    ).handler(this._sanitizeUser(user))

    // returning the user from the handler means to log them in automatically
    if (response) {
      return this._loginResponse(user)
    } else {
      return this._logoutResponse({})
    }
  }

  async signup(): Promise<AuthMethodOutput> {
    const { enabled = true } = this.options.signup
    if (!enabled) {
      throw new DbAuthError.FlowNotEnabledError(
        (this.options.signup as SignupFlowOptions)?.errors?.flowNotEnabled ||
          `Signup flow is not enabled`,
      )
    }

    // check if password is valid
    const { password } = this.normalizedRequest.jsonBody || {}
    ;(this.options.signup as SignupFlowOptions).passwordValidation?.(
      password as string,
    )

    const userOrMessage = await this._createUser()

    // at this point `user` is either an actual user, in which case log the
    // user in automatically, or it's a string, which is a message to show
    // the user (something like "please verify your email")
    if (typeof userOrMessage === 'object') {
      const user = userOrMessage
      return this._loginResponse(user, 201)
    } else {
      const message = userOrMessage
      return [JSON.stringify({ message }), new Headers(), { statusCode: 201 }]
    }
  }

  async validateResetToken(): Promise<AuthMethodOutput> {
    const { resetToken } = this.normalizedRequest.jsonBody || {}
    // is token present at all?
    if (!resetToken || String(resetToken).trim() === '') {
      throw new DbAuthError.ResetTokenRequiredError(
        (
          this.options.resetPassword as ResetPasswordFlowOptions
        )?.errors?.resetTokenRequired,
      )
    }

    const user = await this._findUserByToken(resetToken)

    return [JSON.stringify(this._sanitizeUser(user)), this._deleteSessionHeader]
  }

  // browser submits WebAuthn credentials
  async webAuthnAuthenticate(): Promise<AuthMethodOutput> {
    const { verifyAuthenticationResponse } = await import(
      '@simplewebauthn/server'
    )
    const webAuthnOptions = this.options.webAuthn

    const { rawId } = this.normalizedRequest.jsonBody || {}

    if (!rawId) {
      throw new DbAuthError.WebAuthnError('Missing Id in request')
    }

    if (!webAuthnOptions?.enabled) {
      throw new DbAuthError.WebAuthnError('WebAuthn is not enabled')
    }

    const credential = await this.dbCredentialAccessor.findFirst({
      where: { id: rawId },
    })

    if (!credential) {
      throw new DbAuthError.WebAuthnError('Credentials not found')
    }

    const user = await this.dbAccessor.findFirst({
      where: {
        [this.options.authFields.id]:
          credential[webAuthnOptions.credentialFields.userId],
      },
    })

    let verification: VerifiedAuthenticationResponse
    try {
      const opts: VerifyAuthenticationResponseOpts = {
        response: this.normalizedRequest
          ?.jsonBody as AuthenticationResponseJSON, // by this point jsonBody has been validated
        expectedChallenge: user[this.options.authFields.challenge as string],
        expectedOrigin: webAuthnOptions.origin,
        expectedRPID: webAuthnOptions.domain,
        authenticator: {
          credentialID: base64url.toBuffer(
            credential[webAuthnOptions.credentialFields.id],
          ),
          credentialPublicKey:
            credential[webAuthnOptions.credentialFields.publicKey],
          counter: credential[webAuthnOptions.credentialFields.counter],
          transports: credential[webAuthnOptions.credentialFields.transports]
            ? JSON.parse(
                credential[webAuthnOptions.credentialFields.transports],
              )
            : DbAuthHandler.AVAILABLE_WEBAUTHN_TRANSPORTS,
        },
        requireUserVerification: true,
      }

      verification = await verifyAuthenticationResponse(opts)
    } catch (e: any) {
      throw new DbAuthError.WebAuthnError(e.message)
    } finally {
      // whether it worked or errored, clear the challenge in the user record
      // and user can get a new one next time they try to authenticate
      await this._saveChallenge(user[this.options.authFields.id], null)
    }

    const { verified, authenticationInfo } = verification

    if (verified) {
      // update counter in credentials
      await this.dbCredentialAccessor.update({
        where: {
          [webAuthnOptions.credentialFields.id]:
            credential[webAuthnOptions.credentialFields.id],
        },
        data: {
          [webAuthnOptions.credentialFields.counter]:
            authenticationInfo.newCounter,
        },
      })
    }

    // get the regular `login` cookies
    const [, headers] = this._loginResponse(user)

    // Now add the webAuthN cookies
    headers.append(
      'set-cookie',
      this._webAuthnCookie(rawId, this.webAuthnExpiresDate),
    )

    return [verified, headers]
  }

  // get options for a WebAuthn authentication
  async webAuthnAuthOptions(): Promise<AuthMethodOutput> {
    const { generateAuthenticationOptions } = await import(
      '@simplewebauthn/server'
    )

    if (!this.options.webAuthn?.enabled) {
      throw new DbAuthError.WebAuthnError('WebAuthn is not enabled')
    }

    const webAuthnOptions = this.options.webAuthn

    const credentialId = webAuthnSession(this.event)

    let user

    if (credentialId) {
      const credential = await this.dbCredentialAccessor.findUnique({
        where: { [webAuthnOptions.credentialFields.id]: credentialId },
        include: { [this.options.authModelAccessor]: true },
      })
      user = credential[this.options.authModelAccessor]
    } else {
      // webauthn session not present, fallback to getting user from regular
      // session cookie
      user = await this._getCurrentUser()
    }

    // webauthn cookie has been tampered with or UserCredential has been deleted
    // from the DB, remove their cookie so it doesn't happen again
    if (!user) {
      return [
        { error: 'Log in with username and password to enable WebAuthn' },
        new Headers([['set-cookie', this._webAuthnCookie('', 'now')]]),
        { statusCode: 400 },
      ]
    }

    const credentials = await this.dbCredentialAccessor.findMany({
      where: {
        [webAuthnOptions.credentialFields.userId]:
          user[this.options.authFields.id],
      },
    })

    const someOptions: GenerateAuthenticationOptionsOpts = {
      timeout: webAuthnOptions.timeout || 60000,
      allowCredentials: credentials.map((cred: Record<string, string>) => ({
        id: base64url.toBuffer(cred[webAuthnOptions.credentialFields.id]),
        type: 'public-key',
        transports: cred[webAuthnOptions.credentialFields.transports]
          ? JSON.parse(cred[webAuthnOptions.credentialFields.transports])
          : DbAuthHandler.AVAILABLE_WEBAUTHN_TRANSPORTS,
      })),
      userVerification: 'required',
      rpID: webAuthnOptions.domain,
    }

    const authOptions = generateAuthenticationOptions(someOptions)

    await this._saveChallenge(
      user[this.options.authFields.id],
      authOptions.challenge,
    )

    return [authOptions]
  }

  // get options for WebAuthn registration
  async webAuthnRegOptions(): Promise<AuthMethodOutput> {
    const { generateRegistrationOptions } = await import(
      '@simplewebauthn/server'
    )

    if (!this.options?.webAuthn?.enabled) {
      throw new DbAuthError.WebAuthnError('WebAuthn is not enabled')
    }

    const webAuthnOptions = this.options.webAuthn

    const user = await this._getCurrentUser()
    const options: GenerateRegistrationOptionsOpts = {
      rpName: webAuthnOptions.name,
      rpID: webAuthnOptions.domain,
      userID: user[this.options.authFields.id],
      userName: user[this.options.authFields.username],
      timeout: webAuthnOptions?.timeout || 60000,
      excludeCredentials: [],
      authenticatorSelection: {
        userVerification: 'required',
      },
      // Support the two most common algorithms: ES256, and RS256
      supportedAlgorithmIDs: [-7, -257],
    }

    // if a type is specified other than `any` assign it (the default behavior
    // of this prop if `undefined` means to allow any authenticator)
    if (webAuthnOptions.type && webAuthnOptions.type !== 'any') {
      options.authenticatorSelection = Object.assign(
        options.authenticatorSelection || {},
        { authenticatorAttachment: webAuthnOptions.type },
      )
    }

    const regOptions = generateRegistrationOptions(options)

    await this._saveChallenge(
      user[this.options.authFields.id],
      regOptions.challenge,
    )

    return [regOptions]
  }

  // browser submits WebAuthn credentials for the first time on a new device
  async webAuthnRegister(): Promise<AuthMethodOutput> {
    const { verifyRegistrationResponse } = await import(
      '@simplewebauthn/server'
    )

    if (!this.options.webAuthn?.enabled) {
      throw new DbAuthError.WebAuthnError('WebAuthn is not enabled')
    }

    const user = await this._getCurrentUser()

    let verification: VerifiedRegistrationResponse
    try {
      const options: VerifyRegistrationResponseOpts = {
        response: this.normalizedRequest.jsonBody as RegistrationResponseJSON, // by this point jsonBody has been validated
        expectedChallenge: user[this.options.authFields.challenge as string],
        expectedOrigin: this.options.webAuthn.origin,
        expectedRPID: this.options.webAuthn.domain,
        requireUserVerification: true,
      }
      verification = await verifyRegistrationResponse(options)
    } catch (e: any) {
      throw new DbAuthError.WebAuthnError(e.message)
    }

    const { verified, registrationInfo } = verification
    let plainCredentialId

    if (verified && registrationInfo) {
      const { credentialPublicKey, credentialID, counter } = registrationInfo
      plainCredentialId = base64url.encode(Buffer.from(credentialID))

      const existingDevice = await this.dbCredentialAccessor.findFirst({
        where: {
          [this.options.webAuthn.credentialFields.id]: plainCredentialId,
          [this.options.webAuthn.credentialFields.userId]:
            user[this.options.authFields.id],
        },
      })

      if (!existingDevice) {
        const { transports } = this.normalizedRequest.jsonBody || {}
        await this.dbCredentialAccessor.create({
          data: {
            [this.options.webAuthn.credentialFields.id]: plainCredentialId,
            [this.options.webAuthn.credentialFields.userId]:
              user[this.options.authFields.id],
            [this.options.webAuthn.credentialFields.publicKey]:
              Buffer.from(credentialPublicKey),
            [this.options.webAuthn.credentialFields.transports]: transports
              ? JSON.stringify(transports)
              : null,
            [this.options.webAuthn.credentialFields.counter]: counter,
          },
        })
      }
    } else {
      throw new DbAuthError.WebAuthnError('Registration failed')
    }

    // clear challenge
    await this._saveChallenge(user[this.options.authFields.id], null)

    const headers = new Headers([
      [
        'set-cookie',
        this._webAuthnCookie(plainCredentialId, this.webAuthnExpiresDate),
      ],
    ])

    return [verified, headers]
  }

  // validates that we have all the ENV and options we need to login/signup
  _validateOptions() {
    // must have a SESSION_SECRET so we can encrypt/decrypt the cookie
    if (!process.env.SESSION_SECRET) {
      throw new DbAuthError.NoSessionSecretError()
    }

    // must have an expiration time set for the session cookie
    if (
      this.options?.login?.enabled !== false &&
      !this.options?.login?.expires
    ) {
      throw new DbAuthError.NoSessionExpirationError()
    }

    // must have a login handler to actually log a user in
    if (
      this.options?.login?.enabled !== false &&
      !this.options?.login?.handler
    ) {
      throw new DbAuthError.NoLoginHandlerError()
    }

    // must have a signup handler to define how to create a new user
    if (
      this.options?.signup?.enabled !== false &&
      !this.options?.signup?.handler
    ) {
      throw new DbAuthError.NoSignupHandlerError()
    }

    // must have a forgot password handler to define how to notify user of reset token
    if (
      this.options?.forgotPassword?.enabled !== false &&
      !this.options?.forgotPassword?.handler
    ) {
      throw new DbAuthError.NoForgotPasswordHandlerError()
    }

    // must have a reset password handler to define what to do with user once password changed
    if (
      this.options?.resetPassword?.enabled !== false &&
      !this.options?.resetPassword?.handler
    ) {
      throw new DbAuthError.NoResetPasswordHandlerError()
    }

    // must have webAuthn config if credentialModelAccessor present and vice versa
    if (
      (this.options?.credentialModelAccessor && !this.options?.webAuthn) ||
      (this.options?.webAuthn && !this.options?.credentialModelAccessor)
    ) {
      throw new DbAuthError.NoWebAuthnConfigError()
    }

    if (
      this.options?.webAuthn?.enabled &&
      (!this.options?.webAuthn?.name ||
        !this.options?.webAuthn?.domain ||
        !this.options?.webAuthn?.origin ||
        !this.options?.webAuthn?.credentialFields)
    ) {
      throw new DbAuthError.MissingWebAuthnConfigError()
    }
  }

  // Save challenge string for WebAuthn
  async _saveChallenge(userId: string | number, value: string | null) {
    await this.dbAccessor.update({
      where: {
        [this.options.authFields.id]: userId,
      },
      data: {
        [this.options.authFields.challenge as string]: value,
      },
    })
  }

  // returns the string for the webAuthn set-cookie header
  _webAuthnCookie(id: string, expires: string) {
    return [
      `webAuthn=${id}`,
      ...this._cookieAttributes({
        expires,
        options: { HttpOnly: false },
      }),
    ].join(';')
  }

  // removes any fields not explicitly allowed to be sent to the client before
  // sending a response over the wire
  _sanitizeUser(user: Record<string, unknown>) {
    const sanitized = JSON.parse(JSON.stringify(user))

    Object.keys(sanitized).forEach((key) => {
      if (!this.allowedUserFields.includes(key)) {
        delete sanitized[key]
      }
    })

    return sanitized
  }

  // Converts LambdaEvent or FetchRequest to
  _decodeEvent() {}

  // returns all the cookie attributes in an array with the proper expiration date
  //
  // pass the argument `expires` set to "now" to get the attributes needed to expire
  // the session, or "future" (or left out completely) to set to `futureExpiresDate`
  _cookieAttributes({
    expires = 'now',
    options = {},
  }: {
    expires?: 'now' | string
    options?: DbAuthHandlerOptions['cookie']
  }) {
    // TODO: When we drop support for specifying cookie attributes directly on
    // `options.cookie` we can get rid of all of this and just spread
    // `this.options.cookie?.attributes` directly into `cookieOptions` below
    const userCookieAttributes = this.options.cookie?.attributes
      ? { ...this.options.cookie?.attributes }
      : { ...this.options.cookie }
    if (!this.options.cookie?.attributes) {
      delete userCookieAttributes.name
    }

    const cookieOptions = { ...userCookieAttributes, ...options }
    const meta = Object.keys(cookieOptions)
      .map((key) => {
        const optionValue =
          cookieOptions[key as keyof DbAuthHandlerOptions['cookie']]

        // Convert the options to valid cookie string
        if (optionValue === true) {
          return key
        } else if (optionValue === false) {
          return null
        } else {
          return `${key}=${optionValue}`
        }
      })
      .filter((v) => v)

    const expiresAt =
      expires === 'now' ? DbAuthHandler.PAST_EXPIRES_DATE : expires
    meta.push(`Expires=${expiresAt}`)

    return meta
  }

  _createAuthProviderCookieString(): string {
    return [
      `auth-provider=dbAuth`,
      ...this._cookieAttributes({ expires: this.sessionExpiresDate }),
    ].join(';')
  }

  // returns the set-cookie header to be returned in the request (effectively
  // creates the session)
  _createSessionCookieString<TIdType = any>(
    data: DbAuthSession<TIdType>,
    csrfToken: string,
  ): string {
    const session = JSON.stringify(data) + ';' + csrfToken
    const encrypted = encryptSession(session)
    const sessionCookieString = [
      `${generateCookieName(this.options.cookie?.name)}=${encrypted}`,
      ...this._cookieAttributes({ expires: this.sessionExpiresDate }),
    ].join(';')

    return sessionCookieString
  }

  // checks the CSRF token in the header against the CSRF token in the session
  // and throw an error if they are not the same (not used yet)
  async _validateCsrf() {
    if (
      this.sessionCsrfToken !== this.normalizedRequest.headers.get('csrf-token')
    ) {
      throw new DbAuthError.CsrfTokenMismatchError()
    }
    return true
  }

  async _findUserByToken(token: string) {
    const tokenExpires = new Date()
    tokenExpires.setSeconds(
      tokenExpires.getSeconds() -
        (this.options.forgotPassword as ForgotPasswordFlowOptions).expires,
    )

    const tokenHash = hashToken(token)

    const user = await this.dbAccessor.findFirst({
      where: {
        [this.options.authFields.resetToken]: tokenHash,
      },
    })

    // user not found with the given token
    if (!user) {
      throw new DbAuthError.ResetTokenInvalidError(
        (
          this.options.resetPassword as ResetPasswordFlowOptions
        )?.errors?.resetTokenInvalid,
      )
    }

    // token has expired
    if (user[this.options.authFields.resetTokenExpiresAt] < tokenExpires) {
      await this._clearResetToken(user)
      throw new DbAuthError.ResetTokenExpiredError(
        (
          this.options.resetPassword as ResetPasswordFlowOptions
        )?.errors?.resetTokenExpired,
      )
    }

    return user
  }

  // removes the resetToken from the database
  async _clearResetToken(user: Record<string, unknown>) {
    try {
      await this.dbAccessor.update({
        where: {
          [this.options.authFields.id]: user[this.options.authFields.id],
        },
        data: {
          [this.options.authFields.resetToken]: null,
          [this.options.authFields.resetTokenExpiresAt]: null,
        },
      })
    } catch {
      throw new DbAuthError.GenericError()
    }
  }

  // verifies that a username and password are correct, and returns the user if so
  async _verifyUser(
    username: string | undefined,
    password: string | undefined,
  ) {
    // do we have all the query params we need to check the user?
    if (
      !username ||
      username.toString().trim() === '' ||
      !password ||
      password.toString().trim() === ''
    ) {
      throw new DbAuthError.UsernameAndPasswordRequiredError(
        (
          this.options.login as LoginFlowOptions
        )?.errors?.usernameOrPasswordMissing,
      )
    }

    const usernameMatchFlowOption = (this.options.login as LoginFlowOptions)
      ?.usernameMatch
    const findUniqueUserMatchCriteriaOptions =
      this._getUserMatchCriteriaOptions(username, usernameMatchFlowOption)
    let user

    try {
      // does user exist?
      user = await this.dbAccessor.findFirst({
        where: findUniqueUserMatchCriteriaOptions,
      })
    } catch {
      throw new DbAuthError.GenericError()
    }

    if (!user) {
      throw new DbAuthError.UserNotFoundError(
        username,
        (this.options.login as LoginFlowOptions)?.errors?.usernameNotFound,
      )
    }

    await this._verifyPassword(user, password)
    return user
  }

  // extracts scrypt strength options from hashed password (if present) and
  // compares the hashed plain text password just submitted using those options
  // with the one in the database. Falls back to the legacy CryptoJS algorihtm
  // if no options are present.
  async _verifyPassword(user: Record<string, unknown>, password: string) {
    const options = extractHashingOptions(
      user[this.options.authFields.hashedPassword] as string,
    )

    if (Object.keys(options).length) {
      // hashed using the node:crypto algorithm
      const [hashedPassword] = hashPassword(password, {
        salt: user[this.options.authFields.salt] as string,
        options,
      })

      if (hashedPassword === user[this.options.authFields.hashedPassword]) {
        return user
      }
    } else {
      // fallback to old CryptoJS hashing
      const [legacyHashedPassword] = legacyHashPassword(
        password,
        user[this.options.authFields.salt] as string,
      )

      if (
        legacyHashedPassword === user[this.options.authFields.hashedPassword]
      ) {
        const [newHashedPassword] = hashPassword(password, {
          salt: user[this.options.authFields.salt] as string,
        })

        // update user's hash to the new algorithm
        await this.dbAccessor.update({
          where: { id: user.id },
          data: { [this.options.authFields.hashedPassword]: newHashedPassword },
        })
        return user
      }
    }

    throw new DbAuthError.IncorrectPasswordError(
      user[this.options.authFields.username] as string,
      (this.options.login as LoginFlowOptions)?.errors?.incorrectPassword,
    )
  }

  // gets the user from the database and returns only its ID
  async _getCurrentUser() {
    if (!this.session?.[this.options.authFields.id]) {
      throw new DbAuthError.NotLoggedInError()
    }

    const select = {
      [this.options.authFields.id]: true,
      [this.options.authFields.username]: true,
    }

    if (this.options.webAuthn?.enabled && this.options.authFields.challenge) {
      select[this.options.authFields.challenge] = true
    }

    let user

    try {
      user = await this.dbAccessor.findUnique({
        where: {
          [this.options.authFields.id]:
            this.session?.[this.options.authFields.id],
        },
        select,
      })
    } catch (e: any) {
      throw new DbAuthError.GenericError(e.message)
    }

    if (!user) {
      throw new DbAuthError.UserNotFoundError()
    }

    return user
  }

  // creates and returns a user, first checking that the username/password
  // values pass validation
  async _createUser() {
    const { username, password, ...userAttributes } =
      this.normalizedRequest.jsonBody || {}
    if (
      this._validateField('username', username) &&
      this._validateField('password', password)
    ) {
      const usernameMatchFlowOption = (this.options.signup as SignupFlowOptions)
        ?.usernameMatch
      const findUniqueUserMatchCriteriaOptions =
        this._getUserMatchCriteriaOptions(username, usernameMatchFlowOption)

      const user = await this.dbAccessor.findFirst({
        where: findUniqueUserMatchCriteriaOptions,
      })

      if (user) {
        throw new DbAuthError.DuplicateUsernameError(
          username,
          (this.options.signup as SignupFlowOptions)?.errors?.usernameTaken,
        )
      }

      // if we get here everything is good, call the app's signup handler
      const [hashedPassword, salt] = hashPassword(password)
      const newUser = await (this.options.signup as SignupFlowOptions).handler({
        username,
        hashedPassword,
        salt,
        userAttributes,
      })

      return newUser
    }
  }

  // figure out which auth method we're trying to call
  async _getAuthMethod() {
    // try getting it from the query string, /.redwood/functions/auth?method=[methodName]
    let methodName = this.normalizedRequest.query?.method as AuthMethodNames

    if (
      !DbAuthHandler.METHODS.includes(methodName) &&
      this.normalizedRequest.jsonBody
    ) {
      // try getting it from the body in JSON: { method: [methodName] }
      try {
        methodName = this.normalizedRequest.jsonBody.method
      } catch {
        // there's no body, or it's not JSON, `handler` will return a 404
      }
    }

    return methodName
  }

  // checks that a single field meets validation requirements
  // currently checks for presence only
  _validateField(name: string, value: string | undefined): value is string {
    // check for presence
    if (!value || value.trim() === '') {
      throw new DbAuthError.FieldRequiredError(
        name,
        (this.options.signup as SignupFlowOptions)?.errors?.fieldMissing,
      )
    } else {
      return true
    }
  }

  _loginResponse(
    user: Record<string, any>,
    statusCode = 200,
  ): [{ id: string }, Headers, { statusCode: number }] {
    const sessionData = this._sanitizeUser(user)

    // TODO: this needs to go into graphql somewhere so that each request makes a new CSRF token and sets it in both the encrypted session and the csrf-token header
    const csrfToken = DbAuthHandler.CSRF_TOKEN

    const headers = new Headers()

    headers.append('csrf-token', csrfToken)
    headers.append('set-cookie', this._createAuthProviderCookieString())
    headers.append(
      'set-cookie',
      this._createSessionCookieString(sessionData, csrfToken),
    )

    return [sessionData, headers, { statusCode }]
  }

  _logoutResponse(response?: Record<string, unknown>): AuthMethodOutput {
    return [response ? JSON.stringify(response) : '', this._deleteSessionHeader]
  }

  _ok(
    body: string | boolean | undefined | Record<string, unknown>,
    headers = new Headers(),
    options = { statusCode: 200 },
  ) {
    headers.append('content-type', 'application/json')

    return {
      statusCode: options.statusCode,
      body: typeof body === 'string' ? body : JSON.stringify(body),
      headers,
    }
  }

  _notFound() {
    return {
      statusCode: 404,
    }
  }

  _badRequest(message: string) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: message }),
      headers: new Headers({ 'content-type': 'application/json' }),
    }
  }

  _getUserMatchCriteriaOptions(
    username: string,
    usernameMatchFlowOption: string | undefined,
  ) {
    // Each db provider has it owns rules for case insensitive comparison.
    // We are checking if you have defined one for your db choice here
    // https://www.prisma.io/docs/concepts/components/prisma-client/case-sensitivity
    const findUniqueUserMatchCriteriaOptions = !usernameMatchFlowOption
      ? { [this.options.authFields.username]: username }
      : {
          [this.options.authFields.username]: {
            equals: username,
            mode: usernameMatchFlowOption,
          },
        }

    return findUniqueUserMatchCriteriaOptions
  }
}
