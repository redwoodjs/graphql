import { verifierLookup } from './common'
import type {
  SupportedVerifierTypes,
  VerifyOptions,
  WebhookVerifier,
} from './common'

/**
 * @param {SupportedVerifierTypes} type - What verification type methods used to sign and verify signatures
 * @param {VerifyOptions} options - Options used to verify the signature based on verifiers requirements
 */
export const createVerifier = (
  type: SupportedVerifierTypes,
  options?: VerifyOptions,
): WebhookVerifier => {
  if (options) {
    return verifierLookup[type](options)
  } else {
    return verifierLookup[type]()
  }
}

export * from './common'
