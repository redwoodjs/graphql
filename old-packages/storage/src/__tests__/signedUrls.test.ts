import { describe, expect, beforeEach, afterEach, vi, it, test } from 'vitest'

import { EXPIRES_IN, UrlSigner } from '../UrlSigner.js'

const signer = new UrlSigner({
  // Doing this means we don't need to mock getConfig
  endpoint: 'https://myapiside.com/access-signed-file',
  secret: 'bazinga-3-32-151',
})

describe('UrlSigner', () => {
  it('Can creates a signature', () => {
    const { signature, expiry: expires } = signer.generateSignature({
      filePath: '/tmp/myfile.txt',
      expiresInMs: EXPIRES_IN.days(5),
    })

    expect(signature).toBeDefined()

    expect(diffInDaysFromNow(expires as number)).toBeCloseTo(5)
  })

  it('throws with correct error when wrong expires passed', () => {
    const { signature, expiry: expires } = signer.generateSignature({
      filePath: '/tmp/myfile.txt',
      expiresInMs: EXPIRES_IN.days(1),
    })

    expect(() =>
      signer.validateSignature({
        path: '/tmp/myfile.txt',
        s: signature,
        expiry: expires,
      }),
    ).not.toThrow()

    expect(() =>
      signer.validateSignature({
        path: '/tmp/myfile.txt',
        s: signature,
        expiry: 12512351,
      }),
    ).toThrowError('Signature has expired')
  })

  it('Handles url encoded filePaths', () => {
    const { signature, expiry: expires } = signer.generateSignature({
      filePath: '/tmp/myfile.txt',
      expiresInMs: EXPIRES_IN.days(1),
    })

    expect(() =>
      signer.validateSignature({
        path: encodeURIComponent('/tmp/myfile.txt'),
        s: signature,
        expiry: expires,
      }),
    ).not.toThrow()
  })

  it('Throws an invalid signature when signature is wrong', () => {
    const { signature, expiry } = signer.generateSignature({
      filePath: '/tmp/myfile.txt',
      expiresInMs: EXPIRES_IN.days(1),
    })

    expect(() =>
      signer.validateSignature({
        path: '/tmp/myfile.txt',
        s: signature,
        expiry,
      }),
    ).not.toThrow()

    expect(() =>
      signer.validateSignature({
        path: '/tmp/myfile.txt',
        s: 'im-the-wrong-signature',
        expiry,
      }),
    ).toThrowError('Invalid signature')
  })

  it('Throws an invalid signature when file path is wrong', () => {
    const { signature, expiry } = signer.generateSignature({
      filePath: '/tmp/myfile.txt',
      expiresInMs: EXPIRES_IN.days(20),
    })
    expect(() =>
      signer.validateSignature({
        path: '/tmp/some-other-file.txt',
        s: signature,
        expiry,
      }),
    ).toThrowError('Invalid signature')
  })
})

describe('Expired signature', () => {
  // Separate, so we can mock the times
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('throws an error when the signature has expired', () => {
    const filePath = '/bazinga/kittens.png'
    const { signature, expiry } = signer.generateSignature({
      filePath,
      expiresInMs: EXPIRES_IN.minutes(15),
    })

    const validation = () =>
      signer.validateSignature({
        path: filePath,
        s: signature,
        expiry,
      })

    expect(validation).not.toThrow()

    // Time travel to the future
    vi.advanceTimersByTime(EXPIRES_IN.days(1))

    expect(validation).toThrowError('Signature has expired')
  })
})

test('Generates a signed url', () => {
  const signedUrl = signer.generateSignedUrl(
    '/files/bazinga',
    EXPIRES_IN.days(1),
  )

  expect(signedUrl).toContain('https://myapiside.com/access-signed-file?s=')
  expect(signedUrl).toMatch(/s=.*/)
  expect(signedUrl).toMatch(/expiry=[0-9]+/)
  expect(signedUrl).toContain(`path=${encodeURIComponent('/files/bazinga')}`) // The actual file path
})

describe('validatePath', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('validates a path or url with a valid signature and expiry', () => {
    const filePath = '/tmp/myfile.txt'
    const expiresInMs = EXPIRES_IN.days(1)
    const { signature, expiry } = signer.generateSignature({
      filePath,
      expiresInMs,
    })

    const signedPath = `/bazinga?s=${signature}&expiry=${expiry}&path=${encodeURIComponent(
      filePath,
    )}`

    // When its just a path
    expect(() => signer.validateSignedUrl(signedPath)).not.toThrow()
    expect(signer.validateSignedUrl(signedPath)).toBe(filePath)

    // When its a full url
    const signedUrl = `https://myredwoodapp.com/bazinga?s=${signature}&expiry=${expiry}&path=${encodeURIComponent(
      filePath,
    )}`

    expect(() => signer.validateSignedUrl(signedUrl)).not.toThrow()
    expect(signer.validateSignedUrl(signedUrl)).toBe(filePath)
  })

  it('throws an error when the signature has expired', () => {
    const filePath = '/tmp/myfile.txt'
    const expiresInMs = EXPIRES_IN.minutes(15)
    const { signature, expiry } = signer.generateSignature({
      filePath,
      expiresInMs,
    })

    const url = `/bazinga?s=${signature}&expiry=${expiry}&path=${encodeURIComponent(
      filePath,
    )}`

    // Time travel to the future
    vi.advanceTimersByTime(EXPIRES_IN.days(1))

    expect(() => signer.validateSignedUrl(url)).toThrowError(
      'Signature has expired',
    )
  })

  it('throws an error when the signature is invalid', () => {
    const filePath = '/tmp/myfile.txt'
    const expiresInMs = EXPIRES_IN.days(1)
    const { signature, expiry } = signer.generateSignature({
      filePath,
      expiresInMs,
    })

    const url = `/bazinga?s=${signature}&expiry=${expiry}&path=${encodeURIComponent(
      filePath,
    )}`

    const invalidSignatureUrl = url.replace(signature, 'invalid-signature')

    expect(() => signer.validateSignedUrl(invalidSignatureUrl)).toThrowError(
      'Invalid signature',
    )
  })
})

// Util functions to make the tests more readable
function diffInDaysFromNow(time: number) {
  return Math.abs(time - Date.now()) / 86400000
}
