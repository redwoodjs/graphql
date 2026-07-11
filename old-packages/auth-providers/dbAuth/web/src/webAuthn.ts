class WebAuthnRegistrationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WebAuthnRegistrationError'
  }
}

class WebAuthnAuthenticationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WebAuthnAuthenticationError'
  }
}

class WebAuthnAlreadyRegisteredError extends WebAuthnRegistrationError {
  constructor() {
    super('This device is already registered')
    this.name = 'WebAuthnAlreadyRegisteredError'
  }
}

class WebAuthnDeviceNotFoundError extends WebAuthnAuthenticationError {
  constructor() {
    super('WebAuthn device not found')
    this.name = 'WebAuthnDeviceNotFoundError'
  }
}

class WebAuthnNoAuthenticatorError extends WebAuthnAuthenticationError {
  constructor() {
    super(
      "This device was not recognized. Use username/password login, or if you're using iOS you can try reloading this page",
    )
    this.name = 'WebAuthnNoAuthenticatorError'
  }
}

export default class WebAuthnClient {
  authApiUrl = ''

  private getAuthApiUrl() {
    return this.authApiUrl || `${RWJS_API_URL}/auth`
  }

  setAuthApiUrl(authApiUrl?: string) {
    if (authApiUrl) {
      this.authApiUrl = authApiUrl
    }
  }

  async isSupported() {
    const { browserSupportsWebAuthn } = await import('@simplewebauthn/browser')
    return browserSupportsWebAuthn()
  }

  isEnabled() {
    if (typeof window === 'undefined') {
      return false
    }

    return !!/\bwebAuthn\b/.test(document.cookie)
  }

  private async authenticationOptions() {
    let options

    try {
      const xhr = new XMLHttpRequest()
      xhr.withCredentials = true
      xhr.open(
        'GET',
        `${this.getAuthApiUrl()}?method=webAuthnAuthOptions`,
        false,
      )
      xhr.setRequestHeader('content-type', 'application/json')
      xhr.send(null)

      options = JSON.parse(xhr.responseText)

      if (xhr.status !== 200) {
        if (options.error?.match(/username and password/)) {
          throw new WebAuthnDeviceNotFoundError()
        } else {
          throw new WebAuthnAuthenticationError(
            `Could not start authentication: ${options.error}`,
          )
        }
      }
    } catch (e: any) {
      console.error(e.message)
      throw new WebAuthnAuthenticationError(
        `Could not start authentication: ${e.message}`,
      )
    }

    return options
  }

  async authenticate() {
    const authOptions = await this.authenticationOptions()
    const { startAuthentication } = await import('@simplewebauthn/browser')

    try {
      const browserResponse = await startAuthentication(authOptions)

      const xhr = new XMLHttpRequest()
      xhr.withCredentials = true
      xhr.open('POST', this.getAuthApiUrl(), false)
      xhr.setRequestHeader('content-type', 'application/json')
      xhr.send(
        JSON.stringify({
          method: 'webAuthnAuthenticate',
          ...browserResponse,
        }),
      )

      const options = JSON.parse(xhr.responseText)

      if (xhr.status !== 200) {
        throw new WebAuthnAuthenticationError(
          `Could not complete authentication: ${options.error}`,
        )
      }
    } catch (e: any) {
      if (
        e.message.match(
          /No available authenticator recognized any of the allowed credentials/,
        )
      ) {
        throw new WebAuthnNoAuthenticatorError()
      } else {
        throw new WebAuthnAuthenticationError(
          `Error while authenticating: ${e.message}`,
        )
      }
    }

    return true
  }

  private registrationOptions() {
    let options

    try {
      const xhr = new XMLHttpRequest()
      xhr.withCredentials = true
      xhr.open(
        'GET',
        `${this.getAuthApiUrl()}?method=webAuthnRegOptions`,
        false,
      )
      xhr.setRequestHeader('content-type', 'application/json')
      xhr.send(null)

      options = JSON.parse(xhr.responseText)

      if (xhr.status !== 200) {
        throw new WebAuthnRegistrationError(
          `Could not start registration: ${options.error}`,
        )
      }
    } catch (e: any) {
      console.error(e)
      throw new WebAuthnRegistrationError(
        `Could not start registration: ${e.message}`,
      )
    }

    return options
  }

  async register() {
    const options = await this.registrationOptions()
    let regResponse

    const { startRegistration } = await import('@simplewebauthn/browser')

    try {
      regResponse = await startRegistration(options)
    } catch (e: any) {
      if (e.name === 'InvalidStateError') {
        throw new WebAuthnAlreadyRegisteredError()
      } else {
        throw new WebAuthnRegistrationError(
          `Error while registering: ${e.message}`,
        )
      }
    }

    try {
      const xhr = new XMLHttpRequest()
      xhr.withCredentials = true
      xhr.open('POST', this.getAuthApiUrl(), false)
      xhr.setRequestHeader('content-type', 'application/json')
      xhr.send(JSON.stringify({ method: 'webAuthnRegister', ...regResponse }))

      const options = JSON.parse(xhr.responseText)

      if (xhr.status !== 200) {
        throw new WebAuthnRegistrationError(
          `Could not complete registration: ${options.error}`,
        )
      }
    } catch (e: any) {
      throw new WebAuthnRegistrationError(
        `Error while registering: ${e.message}`,
      )
    }

    return true
  }
}

export type WebAuthnClientType = typeof WebAuthnClient
