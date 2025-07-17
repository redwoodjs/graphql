import { vi, beforeEach, describe, it, expect } from 'vitest'

import WebAuthnClient from '../webAuthn'

globalThis.RWJS_API_URL = '/.redwood/functions'

vi.mock('@simplewebauthn/browser', () => {
  return {
    platformAuthenticatorIsAvailable: () => {},
    startRegistration: () => {},
    startAuthentication: () => {},
  }
})

vi.mock('@whatwg-node/fetch', () => {
  return
})

const mockOpen = vi.fn()
const mockSend = vi.fn()

const xhrMock: Partial<XMLHttpRequest> = {
  open: mockOpen,
  send: mockSend,
  setRequestHeader: vi.fn(),
  readyState: 4,
  status: 200,
  responseText: '{}',
}

vi.spyOn(global, 'XMLHttpRequest').mockImplementation(
  () => xhrMock as XMLHttpRequest,
)

function clearCookies() {
  document.cookie.split(';').forEach(function (c) {
    document.cookie = c
      .replace(/^ +/, '')
      .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/')
  })
}

beforeEach(() => {
  mockOpen.mockClear()
  mockSend.mockClear()
  clearCookies()
})

describe('webAuthn', () => {
  it('can be constructed', () => {
    const webAuthnClient = new WebAuthnClient()

    expect(webAuthnClient).not.toBeNull()
    expect(webAuthnClient).not.toBe(undefined)
  })

  it('uses the webAuthn cookie to check if webAuthn is enabled', () => {
    const webAuthnClient = new WebAuthnClient()

    clearCookies()
    expect(webAuthnClient.isEnabled()).toBeFalsy()

    document.cookie = 'someCookie=foobar'
    document.cookie = 'webAuthn=auth-id'
    document.cookie = 'SOME_OTHER_COOKIE=cannikin'
    expect(webAuthnClient.isEnabled()).toBeTruthy()

    clearCookies()
    document.cookie = 'someCookie=foobar'
    document.cookie = 'SOME_OTHER_COOKIE=cannikin'
    expect(webAuthnClient.isEnabled()).toBeFalsy()

    clearCookies()
    document.cookie = 'someCookie=foobar'
    document.cookie = 'webAuthn=auth-id'
    expect(webAuthnClient.isEnabled()).toBeTruthy()

    clearCookies()
    document.cookie = 'fakewebAuthn=fake-id'
    expect(webAuthnClient.isEnabled()).toBeFalsy()

    clearCookies()
    document.cookie = 'webAuthn=auth-id'
    document.cookie = 'SOME_OTHER_COOKIE=cannikin'
    expect(webAuthnClient.isEnabled()).toBeTruthy()
  })

  it('uses default rwjs api url when calling authenticate()', async () => {
    const webAuthnClient = new WebAuthnClient()
    await webAuthnClient.authenticate()

    expect(mockOpen).toBeCalledWith(
      'GET',
      `${globalThis.RWJS_API_URL}/auth?method=webAuthnAuthOptions`,
      false,
    )
    expect(mockOpen).toBeCalledWith(
      'POST',
      `${globalThis.RWJS_API_URL}/auth`,
      false,
    )
    expect(mockSend).toBeCalledWith(
      expect.stringMatching(/"method":"webAuthnAuthenticate"/),
    )
    expect(mockOpen).toHaveBeenCalledTimes(2)
  })

  it('can be configured with a custom api auth url for authenticate()', async () => {
    const webAuthnClient = new WebAuthnClient()
    webAuthnClient.setAuthApiUrl('/.redwood/functions/webauthn')
    await webAuthnClient.authenticate()

    expect(mockOpen).toBeCalledWith(
      'GET',
      '/.redwood/functions/webauthn?method=webAuthnAuthOptions',
      false,
    )
    expect(mockOpen).toBeCalledWith(
      'POST',
      '/.redwood/functions/webauthn',
      false,
    )
    expect(mockSend).toBeCalledWith(
      expect.stringMatching(/"method":"webAuthnAuthenticate"/),
    )
    expect(mockOpen).toHaveBeenCalledTimes(2)
  })

  it('uses default rwjs api url when calling register()', async () => {
    const webAuthnClient = new WebAuthnClient()
    await webAuthnClient.register()

    expect(mockOpen).toBeCalledWith(
      'GET',
      `${globalThis.RWJS_API_URL}/auth?method=webAuthnRegOptions`,
      false,
    )
    expect(mockOpen).toBeCalledWith(
      'POST',
      `${globalThis.RWJS_API_URL}/auth`,
      false,
    )
    expect(mockSend).toBeCalledWith(
      expect.stringMatching(/"method":"webAuthnRegister"/),
    )
    expect(mockOpen).toHaveBeenCalledTimes(2)
  })

  it('can be configured with a custom api auth url for register()', async () => {
    const webAuthnClient = new WebAuthnClient()
    webAuthnClient.setAuthApiUrl('/.redwood/functions/webauthn')
    await webAuthnClient.register()

    expect(mockOpen).toBeCalledWith(
      'GET',
      '/.redwood/functions/webauthn?method=webAuthnRegOptions',
      false,
    )
    expect(mockOpen).toBeCalledWith(
      'POST',
      '/.redwood/functions/webauthn',
      false,
    )
    expect(mockSend).toBeCalledWith(
      expect.stringMatching(/"method":"webAuthnRegister"/),
    )
    expect(mockOpen).toHaveBeenCalledTimes(2)
  })
})
