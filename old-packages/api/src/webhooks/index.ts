import type { APIGatewayProxyEvent } from 'aws-lambda'

import type { VerifyOptions, SupportedVerifierTypes } from '../auth/verifiers'
import {
  createVerifier,
  WebhookVerificationError,
  DEFAULT_WEBHOOK_SECRET,
  DEFAULT_TOLERANCE,
} from '../auth/verifiers'

export {
  VerifyOptions,
  WebhookVerificationError,
  DEFAULT_WEBHOOK_SECRET,
  SupportedVerifierTypes,
} from '../auth/verifiers'

export const DEFAULT_WEBHOOK_SIGNATURE_HEADER = 'RW-WEBHOOK-SIGNATURE'

/**
 * Extracts body payload from event with base64 encoding check
 *
 */
const eventBody = (event: APIGatewayProxyEvent) => {
  if (event.isBase64Encoded) {
    return Buffer.from(event.body || '', 'base64').toString('utf-8')
  } else {
    return event.body || ''
  }
}

/**
 * Extracts signature from Lambda Event.
 *
 * @param {APIGatewayProxyEvent} event - The event that includes the request details, like headers
 * @param {string} signatureHeader - The name of header key that contains the signature; defaults to DEFAULT_WEBHOOK_SIGNATURE_HEADER
 * @return {string} - The signature found in the headers specified by signatureHeader
 *
 * @example
 *
 *    signatureFromEvent({ event: event })
 */
export const signatureFromEvent = ({
  event,
  signatureHeader = DEFAULT_WEBHOOK_SIGNATURE_HEADER,
}: {
  event: APIGatewayProxyEvent
  signatureHeader: string
}): string => {
  const header = signatureHeader.toLocaleLowerCase()
  return event.headers[header] as string
}

/**
 * Verifies event payload is signed with a valid webhook signature.
 *
 * @param {APIGatewayProxyEvent} event - The event that includes the body for the verification payload and request details, like headers.
 * @param {string} payload - If provided, the payload will be used to verify the signature instead of the event body.
 * @param {string} secret - The secret that will verify the signature according to the verifier type
 * @param {VerifyOptions} options - Options to specify the verifier type the header key that contains the signature, timestamp leeway.
 * @return {boolean | WebhookVerificationError} - Returns true if the signature is verified, or raises WebhookVerificationError.
 *
 * @example
 *
 *    verifyEvent({ event: event, options: {} })*
 */
export const verifyEvent = (
  type: SupportedVerifierTypes,
  {
    event,
    payload,
    secret = DEFAULT_WEBHOOK_SECRET,
    options,
  }: {
    event: APIGatewayProxyEvent
    payload?: string
    secret?: string
    options?: VerifyOptions | undefined
  },
): boolean | WebhookVerificationError => {
  let body = ''

  if (payload) {
    body = payload
  } else {
    body = eventBody(event)
  }

  let signature = signatureFromEvent({
    event,
    signatureHeader:
      options?.signatureHeader || DEFAULT_WEBHOOK_SIGNATURE_HEADER,
  })

  if (options?.signatureTransformer) {
    signature = options.signatureTransformer(signature)
  }

  if (options?.eventTimestamp) {
    const timestamp = options?.currentTimestampOverride ?? Date.now()
    const difference = Math.abs(timestamp - options?.eventTimestamp)
    const tolerance = options?.tolerance ?? DEFAULT_TOLERANCE

    if (difference > tolerance) {
      throw new WebhookVerificationError()
    }
  }

  const { verify } = createVerifier(type, options)

  return verify({ payload: body, secret, signature })
}

/**
 * Standalone verification of webhook signature given a payload, secret, verifier type and options.
 *
 * @param {string} payload - Body content of the event
 * @param {string} secret - The secret that will verify the signature according to the verifier type
 * @param {string} signature - Signature that verifies that the event
 * @param {VerifyOptions} options - Options to specify the verifier type the header key that contains the signature, timestamp leeway.
 * @return {boolean | WebhookVerificationError} - Returns true if the signature is verified, or raises WebhookVerificationError.
 *
 * @example
 *
 *    verifySignature({ payload, secret, signature, options: {} })*
 */
export const verifySignature = (
  type: SupportedVerifierTypes,
  {
    payload,
    secret = DEFAULT_WEBHOOK_SECRET,
    signature,
    options,
  }: {
    payload: string | Record<string, unknown>
    secret: string
    signature: string
    options?: VerifyOptions | undefined
  },
): boolean | WebhookVerificationError => {
  const { verify } = createVerifier(type, options)

  return verify({ payload, secret, signature })
}

/**
 * Signs a payload with a secret and verifier type method
 *
 * @param {string} payload - Body content of the event to sign
 * @param {string} secret - The secret that will verify the signature according to the verifier type
 * @param {VerifyOptions} options - Options to specify the verifier type the header key that contains the signature, timestamp leeway.
 * @return {string} - Returns signature
 *
 * @example
 *
 *    signPayload({ payload, secret, options: {} })*
 */
export const signPayload = (
  type: SupportedVerifierTypes,
  {
    payload,
    secret = DEFAULT_WEBHOOK_SECRET,
    options,
  }: {
    payload: string
    secret: string
    options?: VerifyOptions | undefined
  },
): string => {
  const { sign } = createVerifier(type, options)

  return sign({ payload, secret })
}
