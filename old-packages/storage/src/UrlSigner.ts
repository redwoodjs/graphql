import crypto from 'node:crypto'

import { getConfig } from '@redwoodjs/project-config'

export type SignedUrlSettings = {
  endpoint: string // The path to the signed url endpoint, or a full url (include http(s)://)
  secret: string // The secret to sign the urls with
}

export type SignatureValidationArgs = {
  path: string
  s: string
  expiry?: number | string
}
export class UrlSigner {
  private secret: string
  private endpoint: string

  constructor({ secret, endpoint }: SignedUrlSettings) {
    this.secret = secret
    this.endpoint = endpoint

    this.endpoint = endpoint.startsWith('http')
      ? endpoint
      : `${getConfig().web.apiUrl}${endpoint}`
  }

  generateSignature({
    filePath,
    expiresInMs,
  }: {
    filePath: string
    expiresInMs?: number
  }) {
    if (!this.secret) {
      throw new Error('Please configure the secret')
    }

    if (expiresInMs) {
      const expiry = Date.now() + expiresInMs
      const signature = crypto
        .createHmac('sha256', this.secret)
        .update(`${filePath}:${expiry}`)
        .digest('hex')

      return { expiry, signature }
    } else {
      // Does not expire
      const signature = crypto
        .createHmac('sha256', this.secret)
        .update(filePath)
        .digest('hex')

      return {
        signature,
        expiry: undefined,
      }
    }
  }

  /**
   * The signature and expires have to be extracted from the URL
   */
  validateSignature({
    s: signature,
    path: filePath, // In the URL we call it path
    expiry,
  }: SignatureValidationArgs) {
    if (!this.secret) {
      throw new Error('Please configure the secret')
    }

    if (expiry) {
      // No need to validate if the signature has expired,
      // but make sure its a number!
      if (Date.now() > +expiry) {
        throw new Error('Signature has expired')
      }
    }

    // Decoded filePath
    const decodedFilePath = decodeURIComponent(filePath)

    const validSignature = expiry
      ? crypto
          .createHmac('sha256', this.secret)
          .update(`${decodedFilePath}:${expiry}`)
          .digest('hex')
      : crypto
          .createHmac('sha256', this.secret)
          .update(`${decodedFilePath}`)
          .digest('hex')

    if (validSignature !== signature) {
      throw new Error('Invalid signature')
    }

    return decodedFilePath
  }

  validateSignedUrl(fullPathWithQueryParametersOrUrl: string) {
    const url = new URL(
      fullPathWithQueryParametersOrUrl,
      // We don't care about the host, but just need to create a URL object
      // to parse search params
      fullPathWithQueryParametersOrUrl.startsWith('http')
        ? undefined
        : 'http://localhost',
    )

    const path = url.searchParams.get('path') as string

    this.validateSignature({
      // Note the signature is called 's' in the URL
      s: url.searchParams.get('s') as string,
      expiry: url.searchParams.get('expiry') as string,
      path,
    })

    // Return the decoded path
    return decodeURIComponent(path)
  }

  generateSignedUrl(filePath: string, expiresIn?: number) {
    const { signature, expiry } = this.generateSignature({
      filePath,
      expiresInMs: expiresIn,
    })

    // This way you can pass in a path with params already
    const params = new URLSearchParams()
    params.set('s', signature)
    if (expiry) {
      params.set('expiry', expiry.toString())
    }

    params.set('path', filePath)

    return `${this.endpoint}?${params.toString()}`
  }
}

export const getSignedDetailsFromUrl = (url: string) => {
  const urlObj = new URL(url)
  const expires = urlObj.searchParams.get('expires')
  return {
    expires: expires ? parseInt(expires) : undefined,
    file: urlObj.searchParams.get('file'),
    signature: urlObj.searchParams.get('s'),
  }
}

export const EXPIRES_IN = {
  seconds: (s: number) => s * 1000,
  minutes: (m: number) => m * 60 * 1000,
  hours: (h: number) => h * 60 * 60 * 1000,
  days: (d: number) => d * 24 * 60 * 60 * 1000,
  weeks: (w: number) => w * 7 * 24 * 60 * 60 * 1000,
  months: (m: number) => m * 30 * 24 * 60 * 60 * 1000,
  years: (y: number) => y * 365 * 24 * 60 * 60 * 1000,
}
