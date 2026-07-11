// import type { APIGatewayProxyEvent } from 'aws-lambda'

import { describe, test, expect } from 'vitest'

import { createVerifier, WebhookVerificationError } from '../index'

const payload = 'No more secrets, Marty.'
const secret = 'MY_VOICE_IS_MY_PASSPORT_VERIFY_ME'

describe('timestampScheme verifier', () => {
  describe('signs a payload with default timestamp', () => {
    test('it has a time and scheme', () => {
      const { sign } = createVerifier('timestampSchemeVerifier')

      const signature = sign({ payload, secret })
      expect(signature).toMatch(/t=(\d+),v1=([\da-f]+)/)
    })

    test('it can verify a signature it generates', () => {
      const { sign, verify } = createVerifier('timestampSchemeVerifier')

      const signature = sign({ payload, secret })
      expect(verify({ payload, secret, signature })).toBeTruthy()
    })

    test('it denies a signature when signed with a different secret', () => {
      const { sign, verify } = createVerifier('timestampSchemeVerifier')

      const signature = sign({ payload, secret: 'WERNER_BRANDES' })
      expect(() => {
        verify({ payload, secret, signature })
      }).toThrow(WebhookVerificationError)
    })
  })

  describe('signs a payload with varying timestamps and tolerances', () => {
    test('it denies a signature when verifying with a short tolerance', () => {
      const { sign } = createVerifier('timestampSchemeVerifier', {
        currentTimestampOverride: Date.now() - 600_000, // 10 minutes in msec
      })

      const { verify } = createVerifier('timestampSchemeVerifier', {
        tolerance: 120_000, // 2 minutes in msec
      })

      const signature = sign({
        payload,
        secret,
      })

      expect(() => {
        verify({
          payload,
          secret,
          signature,
        })
      }).toThrow(WebhookVerificationError)
    })

    test('it denies a signature when verifying when outside the default tolerance', () => {
      const { sign } = createVerifier('timestampSchemeVerifier', {
        currentTimestampOverride: Date.now() - 600_000, // 10 minutes in msec
      })

      // uses default 5 minute tolerance
      const { verify } = createVerifier('timestampSchemeVerifier')

      const signature = sign({
        payload,
        secret,
      })

      expect(() => {
        verify({
          payload,
          secret,
          signature,
        })
      }).toThrow(WebhookVerificationError)
    })
  })
})
