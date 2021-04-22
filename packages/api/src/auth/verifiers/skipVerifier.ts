import type { VerifyOptions, WebhookVerifier } from './common'

export interface SkipVerifier extends WebhookVerifier {
  type: 'skipVerifier'
}
/**
 * skipVerifier skips webhook signature verification.
 * Use when there is no signature provided or the webhook is
 * entirely public.
 *
 */
const skipVerifier = (options?: VerifyOptions | undefined): SkipVerifier => {
  if (options) {
    console.warn(`VerifyOptions are ignored for the skipVerifier verifier`)
  }
  return {
    sign: () => {
      console.warn(`No signature is created for the skipVerifier verifier`)
      return ''
    },
    verify: () => {
      console.warn(`The skipVerifier verifier considers all signatures valid`)
      return true
    },
    type: 'skipVerifier',
  }
}

export default skipVerifier
