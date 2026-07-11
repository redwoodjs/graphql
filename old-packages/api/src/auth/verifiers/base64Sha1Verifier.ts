import { createHmac, timingSafeEqual } from 'crypto'

import {
  WebhookVerificationError,
  VERIFICATION_ERROR_MESSAGE,
  DEFAULT_WEBHOOK_SECRET,
} from './common'
import type { WebhookVerifier, VerifyOptions } from './common'

export interface Base64Sha1Verifier extends WebhookVerifier {
  type: 'base64Sha1Verifier'
}

function toNormalizedJsonString(payload: Record<string, unknown>) {
  return JSON.stringify(payload).replace(/[^\\]\\u[\da-f]{4}/g, (s) => {
    return s.slice(0, 3) + s.slice(3).toUpperCase()
  })
}

const createSignature = ({
  payload,
  secret = DEFAULT_WEBHOOK_SECRET,
}: {
  payload: string | Record<string, unknown>
  secret: string
}): string => {
  const algorithm = 'sha1'
  const hmac = createHmac(algorithm, Buffer.from(secret, 'base64'))

  payload =
    typeof payload === 'string' ? payload : toNormalizedJsonString(payload)

  const digest = hmac.update(payload).digest()

  return digest.toString('base64')
}

export const verifySignature = ({
  payload,
  secret = DEFAULT_WEBHOOK_SECRET,
  signature,
}: {
  payload: string | Record<string, unknown>
  secret: string
  signature: string
}): boolean => {
  try {
    const webhookSignature = Buffer.from(signature || '', 'base64')
    const hmac = createHmac('sha1', Buffer.from(secret, 'base64'))

    payload =
      typeof payload === 'string' ? payload : toNormalizedJsonString(payload)

    const digest = hmac.update(payload).digest()

    // constant time comparison to prevent timing attacks
    // https://stackoverflow.com/a/31096242/206879
    // https://en.wikipedia.org/wiki/Timing_attack
    if (
      webhookSignature.length === digest.length &&
      timingSafeEqual(digest, webhookSignature)
    ) {
      return true
    }

    throw new WebhookVerificationError()
  } catch (error: any) {
    throw new WebhookVerificationError(
      `${VERIFICATION_ERROR_MESSAGE}: ${error.message}`,
    )
  }
}

/**
 * Base64 SHA1 HMAC Payload Verifier
 *
 * Based on Svix's webhook payload verification, but using SHA1 instead
 * @see https://docs.svix.com/receiving/verifying-payloads/how-manual
 * @see https://github.com/svix/svix-webhooks/blob/main/javascript/src/index.ts
 */
const base64Sha1Verifier = (_options?: VerifyOptions): Base64Sha1Verifier => {
  return {
    sign: ({ payload, secret }) => {
      return createSignature({ payload, secret })
    },
    verify: ({ payload, secret, signature }) => {
      return verifySignature({ payload, secret, signature })
    },
    type: 'base64Sha1Verifier',
  }
}

export default base64Sha1Verifier
