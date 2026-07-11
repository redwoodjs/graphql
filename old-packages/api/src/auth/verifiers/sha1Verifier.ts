import { createHmac, timingSafeEqual } from 'crypto'

import {
  WebhookVerificationError,
  VERIFICATION_ERROR_MESSAGE,
  DEFAULT_WEBHOOK_SECRET,
} from './common'
import type { WebhookVerifier, VerifyOptions } from './common'

export interface Sha1Verifier extends WebhookVerifier {
  type: 'sha1Verifier'
}

function toNormalizedJsonString(payload: Record<string, unknown>) {
  return JSON.stringify(payload).replace(/[^\\]\\u[\da-f]{4}/g, (s) => {
    return s.substr(0, 3) + s.substr(3).toUpperCase()
  })
}

/**
 *
 * createSignature
 *
 */
const createSignature = ({
  payload,
  secret = DEFAULT_WEBHOOK_SECRET,
}: {
  payload: string | Record<string, unknown>
  secret: string
}): string => {
  const algorithm = 'sha1'
  const hmac = createHmac(algorithm, secret)

  payload =
    typeof payload === 'string' ? payload : toNormalizedJsonString(payload)

  const digest = Buffer.from(
    algorithm + '=' + hmac.update(payload).digest('hex'),
    'utf8',
  )

  return digest.toString()
}

/**
 *
 * verifySignature
 *
 */
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
    const algorithm = signature.split('=')[0]
    const webhookSignature = Buffer.from(signature || '', 'utf8')
    const hmac = createHmac(algorithm, secret)

    payload =
      typeof payload === 'string' ? payload : toNormalizedJsonString(payload)

    const digest = Buffer.from(
      algorithm + '=' + hmac.update(payload).digest('hex'),
      'utf8',
    )

    // constant time comparison to prevent timing attacks
    // https://stackoverflow.com/a/31096242/206879
    // https://en.wikipedia.org/wiki/Timing_attack
    const verified =
      webhookSignature.length === digest.length &&
      timingSafeEqual(digest, webhookSignature)

    if (verified) {
      return verified
    }

    throw new WebhookVerificationError()
  } catch (error: any) {
    throw new WebhookVerificationError(
      `${VERIFICATION_ERROR_MESSAGE}: ${error.message}`,
    )
  }
}

/**
 *
 * SHA1 HMAC Payload Verifier
 *
 * Based on Vercel's webhook payload verification
 * @see https://vercel.com/docs/api#integrations/webhooks/securing-webhooks
 *
 */
const sha1Verifier = (_options?: VerifyOptions): Sha1Verifier => {
  return {
    sign: ({ payload, secret }) => {
      return createSignature({ payload, secret })
    },
    verify: ({ payload, secret, signature }) => {
      return verifySignature({ payload, secret, signature })
    },
    type: 'sha1Verifier',
  }
}

export default sha1Verifier
