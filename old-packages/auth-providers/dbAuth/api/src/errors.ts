export class NoSessionSecretError extends Error {
  constructor() {
    super(
      'dbAuth requires a SESSION_SECRET environment variable that is used to encrypt session cookies. Use `yarn rw g secret` to create one, then add to your `.env` file. DO NOT check this variable in your version control system!!',
    )
    this.name = 'NoSessionSecretError'
  }
}

export class NoSessionExpirationError extends Error {
  constructor() {
    super('dbAuth requires login expiration time, in seconds')
    this.name = 'NoSessionExpirationError'
  }
}

export class NoLoginHandlerError extends Error {
  constructor() {
    super('dbAuth requires a login handler in order to log in a user')
    this.name = 'NoLoginHandlerError'
  }
}

export class NoSignupHandlerError extends Error {
  constructor() {
    super('dbAuth requires a signup handler in order to create new users')
    this.name = 'NoSignupHandlerError'
  }
}

export class NoForgotPasswordHandlerError extends Error {
  constructor() {
    super('dbAuth requires a forgot password handler in order to notify user')
    this.name = 'NoForgotPasswordHandlerError'
  }
}

export class NoResetPasswordHandlerError extends Error {
  constructor() {
    super('dbAuth requires a reset password handler in order to notify user')
    this.name = 'NoResetPasswordHandlerError'
  }
}

export class NoWebAuthnConfigError extends Error {
  constructor() {
    super(
      'To use Webauthn you need both `webauthn` and `credentialModelAccessor` config options, see https://redwoodjs.com/docs/auth/dbAuth#webauthn',
    )
    this.name = 'NoWebAuthnConfigError'
  }
}

export class MissingWebAuthnConfigError extends Error {
  constructor() {
    super(
      'You are missing one or more WebAuthn config options, see https://redwoodjs.com/docs/auth/dbAuth#webauthn',
    )
    this.name = 'MissingWebAuthnConfigError'
  }
}

export class UnknownAuthMethodError extends Error {
  constructor(name: string) {
    super(`Unknown auth method '${name}'`)
    this.name = 'UnknownAuthMethodError'
  }
}

export class WrongVerbError extends Error {
  constructor(properVerb: string) {
    super(`Only accessible via ${properVerb}`)
    this.name = 'WrongVerbError'
  }
}

export class NotLoggedInError extends Error {
  constructor() {
    super(`Cannot retrieve user details without being logged in`)
    this.name = 'NotLoggedInError'
  }
}

export class UserNotFoundError extends Error {
  constructor(
    username: string | undefined = undefined,
    message: string | undefined = 'Username ${username} not found',
  ) {
    if (username) {
      super(message.replace(/\$\{username\}/g, username))
    } else {
      super(`User not found`)
    }

    this.name = 'UserNotFoundError'
  }
}

export class UsernameAndPasswordRequiredError extends Error {
  constructor(
    message: string | undefined = 'Both username and password are required',
  ) {
    super(message)
    this.name = 'UsernameAndPasswordRequiredError'
  }
}

export class NoUserIdError extends Error {
  constructor() {
    super(
      'loginHandler() must return an object with an `id` field as set in `authFields.id`',
    )
    this.name = 'NoUserIdError'
  }
}

export class FieldRequiredError extends Error {
  constructor(
    name: string,
    message: string | undefined = '${field} is required',
  ) {
    super(message.replace(/\$\{field\}/g, name))
    this.name = 'FieldRequiredError'
  }
}

export class DuplicateUsernameError extends Error {
  constructor(
    username: string,
    message: string | undefined = 'Username `${username}` already in use',
  ) {
    super(message.replace(/\$\{username\}/g, username))
    this.name = 'DuplicateUsernameError'
  }
}

export class IncorrectPasswordError extends Error {
  constructor(
    username: string,
    message: string | undefined = 'Incorrect password for ${username}',
  ) {
    super(message.replace(/\$\{username\}/g, username))
    this.name = 'IncorrectPasswordError'
  }
}

export class CsrfTokenMismatchError extends Error {
  constructor() {
    super(`CSRF token mismatch`)
    this.name = 'CsrfTokenMismatchError'
  }
}

export class SessionDecryptionError extends Error {
  constructor() {
    super('Session has potentially been tampered with')
    this.name = 'SessionDecryptionError'
  }
}

export class FlowNotEnabledError extends Error {
  constructor(message = 'Flow is not enabled') {
    super(message)
    this.name = 'FlowNotEnabledError'
  }
}

export class UsernameRequiredError extends Error {
  constructor(message = 'Username is required') {
    super(message)
    this.name = 'UsernameRequiredError'
  }
}

export class PasswordRequiredError extends Error {
  constructor(message = 'Password is required') {
    super(message)
    this.name = 'PasswordRequiredError'
  }
}

export class UsernameNotFoundError extends Error {
  constructor(message = 'Username not found') {
    super(message)
    this.name = 'UsernameNotFoundError'
  }
}

export class ResetTokenExpiredError extends Error {
  constructor(message = 'resetToken is expired') {
    super(message)
    this.name = 'ResetTokenExpiredError'
  }
}

export class ResetTokenInvalidError extends Error {
  constructor(message = 'resetToken is invalid') {
    super(message)
    this.name = 'ResetTokenInvalidError'
  }
}

export class ResetTokenRequiredError extends Error {
  constructor(message = 'resetToken is required') {
    super(message)
    this.name = 'ResetTokenRequiredError'
  }
}

export class ReusedPasswordError extends Error {
  constructor(message = 'Must choose a new password') {
    super(message)
    this.name = 'ReusedPasswordError'
  }
}

export class PasswordValidationError extends Error {
  constructor(message = 'Password is invalid') {
    super(message)
    this.name = 'PasswordValidationError'
  }
}

export class GenericError extends Error {
  constructor(message = 'unknown error occurred') {
    super(message)
    this.name = 'GenericError'
  }
}

export class WebAuthnError extends Error {
  constructor(message = 'WebAuthn Error') {
    super(message)
    this.name = 'WebAuthnError'
  }
}

export class NoWebAuthnSessionError extends WebAuthnError {
  constructor(
    message = 'Log in with username and password to enable WebAuthn',
  ) {
    super(message)
    this.name = 'NoWebAuthnSessionError'
  }
}
