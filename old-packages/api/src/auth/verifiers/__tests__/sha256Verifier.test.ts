import { describe, expect, test } from 'vitest'

import { createVerifier, WebhookVerificationError } from '../index'

const stringPayload = 'No more secrets, Marty.'
const payload = { data: { move: 'Sneakers', quote: stringPayload } }
const secret = 'MY_VOICE_IS_MY_PASSPORT_VERIFY_ME'

const { sign, verify } = createVerifier('sha256Verifier')

describe('sha256 verifier', () => {
  describe('signs a payload with the sha256 algorithm', () => {
    test('the signature matches the algorithm format', () => {
      const signature = sign({ payload, secret })
      expect(signature).toMatch(/sha256=([\da-f]+)/)
    })

    test('it verifies when signed and verified with same secret', () => {
      const signature = sign({ payload, secret })
      expect(verify({ payload, secret, signature })).toBeTruthy()
    })

    test('it denies verification if signature does not represent the secret signed payload', () => {
      const signature =
        'sha265=819468bd4f892c51d2aee3b0842afc2e397d3798d1be0ca9b89273c3f97b1b7a'
      expect(() => {
        verify({ payload, secret, signature })
      }).toThrow(WebhookVerificationError)
    })

    test('it denies verification if the secret used to sign does not match the signature', () => {
      const signature = sign({
        payload,
        secret: 'I_LEAVE_MESSAGE_HERE_ON_SERVICE_BUT_YOU_DO_NOT_CALL',
      })

      expect(() => {
        verify({ payload, secret, signature })
      }).toThrow(WebhookVerificationError)
    })
  })

  describe('signs a string payload with the sha256 algorithm', () => {
    test('the signature matches the algorithm format', () => {
      const signature = sign({ payload: stringPayload, secret })
      expect(signature).toMatch(/sha256=([\da-f]+)/)
    })

    test('it verifies when signed and verified with same secret', () => {
      const signature = sign({ payload: stringPayload, secret })
      expect(verify({ payload: stringPayload, secret, signature })).toBeTruthy()
    })

    test('it denies verification if signature does not represent the secret signed payload', () => {
      const signature =
        'sha265=819468bd4f892c51d2aee3b0842afc2e397d3798d1be0ca9b89273c3f97b1b7a'
      expect(() => {
        verify({ payload: stringPayload, secret, signature })
      }).toThrow(WebhookVerificationError)
    })

    test('it denies verification if the secret used to sign does not match the signature', () => {
      const signature = sign({
        payload: stringPayload,
        secret: 'I_LEAVE_MESSAGE_HERE_ON_SERVICE_BUT_YOU_DO_NOT_CALL',
      })

      expect(() => {
        verify({ payload: stringPayload, secret, signature })
      }).toThrow(WebhookVerificationError)
    })
  })
})
