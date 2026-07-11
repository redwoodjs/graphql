import base64Sha1Verifier from './base64Sha1Verifier'
import type { Base64Sha1Verifier } from './base64Sha1Verifier'
import base64Sha256Verifier from './base64Sha256Verifier'
import type { Base64Sha256Verifier } from './base64Sha256Verifier'
import jwtVerifier from './jwtVerifier'
import type { JwtVerifier } from './jwtVerifier'
import secretKeyVerifier from './secretKeyVerifier'
import type { SecretKeyVerifier } from './secretKeyVerifier'
import sha1Verifier from './sha1Verifier'
import type { Sha1Verifier } from './sha1Verifier'
import sha256Verifier from './sha256Verifier'
import type { Sha256Verifier } from './sha256Verifier'
import skipVerifier from './skipVerifier'
import type { SkipVerifier } from './skipVerifier'
import timestampSchemeVerifier from './timestampSchemeVerifier'
import type { TimestampSchemeVerifier } from './timestampSchemeVerifier'

export const verifierLookup = {
  skipVerifier,
  secretKeyVerifier,
  sha1Verifier,
  sha256Verifier,
  base64Sha1Verifier,
  base64Sha256Verifier,
  timestampSchemeVerifier,
  jwtVerifier,
}

export type SupportedVerifiers =
  | SkipVerifier
  | SecretKeyVerifier
  | Sha1Verifier
  | Sha256Verifier
  | Base64Sha1Verifier
  | Base64Sha256Verifier
  | TimestampSchemeVerifier
  | JwtVerifier

export type SupportedVerifierTypes = keyof typeof verifierLookup

export const DEFAULT_WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? ''

export const VERIFICATION_ERROR_MESSAGE =
  "You don't have access to invoke this function."

export const VERIFICATION_SIGN_MESSAGE = 'Unable to sign payload'

const FIVE_MINUTES = 5 * 60_000

/**
 * @const {number} DEFAULT_TOLERANCE - Five minutes
 */
export const DEFAULT_TOLERANCE = FIVE_MINUTES

/**
 * Class representing a WebhookError
 * @extends Error
 */
class WebhookError extends Error {
  /**
   * Create a WebhookError.
   * @param {string} message - The error message
   * */
  constructor(message: string) {
    super(message)
  }
}

/**
 * Class representing a WebhookVerificationError
 * @extends WebhookError
 */
export class WebhookVerificationError extends WebhookError {
  /**
   * Create a WebhookVerificationError.
   * @param {string} message - The error message
   * */
  constructor(message?: string) {
    super(message || VERIFICATION_ERROR_MESSAGE)
  }
}

/**
 * Class representing a WebhookSignError
 * @extends WebhookError
 */
export class WebhookSignError extends WebhookError {
  /**
   * Create a WebhookSignError.
   * @param {string} message - The error message
   * */
  constructor(message?: string) {
    super(message || VERIFICATION_SIGN_MESSAGE)
  }
}

/**
 * VerifyOptions
 *
 * Used when verifying a signature based on the verifier's requirements
 *
 * @param {string} signatureHeader - Optional Header that contains the signature
 * to verify. Will default to DEFAULT_WEBHOOK_SIGNATURE_HEADER
 * @param {(signature: string) => string} signatureTransformer - Optional
 * function that receives the signature from the headers and returns a new
 * signature to use in the Verifier
 * @param {number} currentTimestampOverride - Optional timestamp to use as the
 * "current" timestamp, in msec
 * @param {number} eventTimestamp - Optional timestamp to use as the event
 * timestamp, in msec. If this is provided the webhook verification will fail
 * if the eventTimestamp is too far from the current time (or the time passed
 * as the `currentTimestampOverride` option)
 * @param {number} tolerance - Optional tolerance in msec
 * @param {string} issuer - Options JWT issuer for JWTVerifier
 */
export interface VerifyOptions {
  signatureHeader?: string
  signatureTransformer?: (signature: string) => string
  currentTimestampOverride?: number
  eventTimestamp?: number
  tolerance?: number
  issuer?: string
}

/**
 * WebhookVerifier is the interface for all verifiers
 */
export interface WebhookVerifier {
  sign({
    payload,
    secret,
  }: {
    payload: string | Record<string, unknown>
    secret: string
  }): string
  verify({
    payload,
    secret,
    signature,
  }: {
    payload: string | Record<string, unknown>
    secret: string
    signature: string
  }): boolean | WebhookVerificationError
  type: SupportedVerifierTypes
}
