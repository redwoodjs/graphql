import { describe, test, expect } from 'vitest'

import {
  createVerifier,
  WebhookSignError,
  WebhookVerificationError,
} from '../index'

const payload = { data: 'No more secrets, Marty.' }
const secret = 'MY_VOICE_IS_MY_PASSPORT_VERIFY_ME'

describe('jwtVerifier verifier', () => {
  describe('signs a payload', () => {
    test('it has a signature', () => {
      const { sign } = createVerifier('jwtVerifier')
      const signature = sign({ payload, secret })
      expect(signature).toMatch(
        /^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/,
      )
    })
  })
  describe('fails to sign a payload', () => {
    test('that it has signed with issuer claim but a string payload', () => {
      const { sign } = createVerifier('jwtVerifier', {
        issuer: 'redwoodjs.com',
      })

      expect(() => {
        sign({ payload: '273-9164. Area code 415.', secret })
      }).toThrow(WebhookSignError)
    })
  })

  describe('it verifies JWT', () => {
    test('that it has signed', () => {
      const { sign, verify } = createVerifier('jwtVerifier')
      const signature = sign({ payload, secret })
      expect(verify({ payload, secret, signature })).toBeTruthy()
    })

    test('that it has signed with issuer claim', () => {
      const { sign, verify } = createVerifier('jwtVerifier', {
        issuer: 'redwoodjs.com',
      })

      const signature = sign({ payload, secret })
      expect(verify({ payload, secret, signature })).toBeTruthy()
    })
  })

  describe('it denies a JWT', () => {
    test('that it has signed with a different secret', () => {
      const { sign, verify } = createVerifier('jwtVerifier')

      const signature = sign({ payload, secret })

      expect(() => {
        verify({ payload, secret: 'not so secret', signature })
      }).toThrow(WebhookVerificationError)
    })

    test('that it has signed with a different issuer', () => {
      const { sign } = createVerifier('jwtVerifier', {
        issuer: 'redwoodjs.com',
      })

      const signature = sign({ payload, secret })

      const { verify } = createVerifier('jwtVerifier', {
        issuer: 'example.com',
      })

      expect(() => {
        verify({ payload, secret, signature })
      }).toThrow(WebhookVerificationError)
    })
  })
})
