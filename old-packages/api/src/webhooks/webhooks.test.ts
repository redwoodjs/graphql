import type { APIGatewayProxyEvent } from 'aws-lambda'
import { beforeEach, afterEach, describe, test, expect, vi } from 'vitest'

import {
  signPayload,
  verifyEvent,
  verifySignature,
  WebhookVerificationError,
  DEFAULT_WEBHOOK_SIGNATURE_HEADER,
} from './index'

const payload = 'No more secrets, Marty.'
const secret = 'MY_VOICE_IS_MY_PASSPORT_VERIFY_ME'
const ONE_MINUTE = 60_000
const TEN_MINUTES = 10 * ONE_MINUTE
const FIFTEEN_MINUTES = 15 * ONE_MINUTE

// See: https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/aws-lambda/trigger/api-gateway-proxy.d.ts
const buildEvent = ({
  payload,
  signature = '',
  signatureHeader = '',
  isBase64Encoded = false,
}): APIGatewayProxyEvent => {
  const headers = {}
  headers[signatureHeader.toLocaleLowerCase()] = signature
  const body = isBase64Encoded
    ? Buffer.from(payload || '').toString('base64')
    : payload

  return {
    body,
    headers,
    multiValueHeaders: {},
    isBase64Encoded,
    path: '',
    pathParameters: null,
    stageVariables: null,
    httpMethod: 'GET',
    queryStringParameters: null,
    requestContext: null,
    resource: null,
    multiValueQueryStringParameters: null,
  }
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(vi.fn())
})

afterEach(() => {
  vi.spyOn(console, 'warn').mockRestore()
})

describe('webhooks', () => {
  describe('using the timestampScheme verifier', () => {
    describe('signs a payload with default timestamp', () => {
      test('it has a time and scheme signature', () => {
        const signature = signPayload('timestampSchemeVerifier', {
          payload,
          secret,
        })

        expect(signature).toMatch(/t=(\d+),v1=([\da-f]+)/)
      })

      test('it signs and verifies', () => {
        const signature = signPayload('timestampSchemeVerifier', {
          payload,
          secret,
        })

        expect(
          verifySignature('timestampSchemeVerifier', {
            payload,
            secret,
            signature,
          }),
        ).toBeTruthy()
      })
    })
  })

  describe('using the sha1 verifier', () => {
    describe('signs a payload', () => {
      test('it has a sha1 signature', () => {
        const signature = signPayload('sha1Verifier', {
          payload,
          secret,
        })

        expect(signature).toMatch(/sha1=([\da-f]+)/)
      })

      test('it signs and verifies', () => {
        const signature = signPayload('sha1Verifier', {
          payload,
          secret,
        })

        expect(
          verifySignature('sha1Verifier', {
            payload,
            secret,
            signature,
          }),
        ).toBeTruthy()
      })
    })
  })

  describe('using the sha256 verifier', () => {
    describe('signs a payload', () => {
      test('it has a sha256 signature', () => {
        const signature = signPayload('sha256Verifier', {
          payload,
          secret,
        })

        expect(signature).toMatch(/sha256=([\da-f]+)/)
      })

      test('it signs and verifies', () => {
        const signature = signPayload('sha256Verifier', {
          payload,
          secret,
        })

        expect(
          verifySignature('sha256Verifier', {
            payload,
            secret,
            signature,
          }),
        ).toBeTruthy()
      })
    })
  })

  describe('using the secret key verifier', () => {
    describe('signs a payload', () => {
      test('it has the key as a signature', () => {
        const signature = signPayload('secretKeyVerifier', {
          payload,
          secret,
        })

        expect(signature).toEqual(secret)
      })

      test('it signs and verifies', () => {
        const signature = signPayload('secretKeyVerifier', {
          payload,
          secret,
        })

        expect(
          verifySignature('secretKeyVerifier', {
            payload,
            secret,
            signature,
          }),
        ).toBeTruthy()
      })
    })
  })

  describe('using the JWT verifier', () => {
    describe('signs a payload', () => {
      test('it has the JWT as a signature', () => {
        const signature = signPayload('jwtVerifier', {
          payload,
          secret,
        })

        expect(signature).toEqual(
          'eyJhbGciOiJIUzI1NiJ9.Tm8gbW9yZSBzZWNyZXRzLCBNYXJ0eS4.LBqlEwDa4bWxzrv_Y1_Y7S6_7czhzLZuF17d5c6YjXI',
        )
      })

      test('it signs and verifies', () => {
        const signature = signPayload('jwtVerifier', {
          payload,
          secret,
        })

        expect(
          verifySignature('jwtVerifier', {
            payload,
            secret,
            signature,
          }),
        ).toBeTruthy()
      })
    })
  })

  describe('using the base64 sha1 verifier', () => {
    describe('signs a payload', () => {
      test('it signs and verifies', () => {
        const signature = signPayload('base64Sha1Verifier', {
          payload,
          secret,
        })

        expect(
          verifySignature('base64Sha1Verifier', {
            payload,
            secret,
            signature,
          }),
        ).toBeTruthy()
      })
    })
  })

  describe('using the base64 sha256 verifier', () => {
    describe('signs a payload', () => {
      test('it has a base64 sha256 signature', () => {
        const body =
          '{"data": {"abandon_at": 1648585920141, ' +
          '"client_id": "client_25hz3vm5USqCG3a7jMXqdjzjJyK", ' +
          '"created_at": 1645993920141, "expire_at": 1646598720141, ' +
          '"id": "sess_25hz5CxFyrNJgDO1TY52LGPtM0e", ' +
          '"last_active_at": 1645993920141, "object": "session", ' +
          '"status": "active", "updated_at": 1645993920149, ' +
          '"user_id": "user_25h1zRMh7owJp6us0Sqs3UXwW0y"}, ' +
          '"object": "event", "type": "session.created"}'

        const payload = `msg_25hz5cPxRz5ilWSQSiYfgxpYHTH.1646004463.${body}`
        const secret = 'MY_VOICE_IS_MY_PASSPORT_VERIFY_ME'
        const signature = signPayload('base64Sha256Verifier', {
          payload,
          secret,
        })

        expect(signature).toMatch(
          'AaP4EgcpPC5oE3eppI/s6EMtQCZ4Ap34wNHPoxBoikI=',
        )
      })

      test('it signs and verifies', () => {
        const signature = signPayload('base64Sha256Verifier', {
          payload,
          secret,
        })

        expect(
          verifySignature('base64Sha256Verifier', {
            payload,
            secret,
            signature,
          }),
        ).toBeTruthy()
      })
    })
  })

  describe('webhooks via event', () => {
    describe('when it receives an event it extracts the signature and payload from the event', () => {
      test('it can verify an event body payload with a signature it generates', () => {
        const signature = signPayload('timestampSchemeVerifier', {
          payload,
          secret,
        })

        const event = buildEvent({
          payload,
          signature,
          signatureHeader: DEFAULT_WEBHOOK_SIGNATURE_HEADER,
        })

        expect(
          verifyEvent('timestampSchemeVerifier', { event, secret }),
        ).toBeTruthy()
      })

      test('it can verify an event base64encoded body payload with a signature it generates', () => {
        const signature = signPayload('timestampSchemeVerifier', {
          payload,
          secret,
        })

        const event = buildEvent({
          payload,
          signature,
          signatureHeader: DEFAULT_WEBHOOK_SIGNATURE_HEADER,
          isBase64Encoded: true,
        })

        expect(
          verifyEvent('timestampSchemeVerifier', { event, secret }),
        ).toBeTruthy()
      })

      test('it can verify overriding the event body payload with a signature it generates', () => {
        const signature = signPayload('timestampSchemeVerifier', {
          payload,
          secret,
        })

        const event = buildEvent({
          payload: { body: payload },
          signature,
          signatureHeader: DEFAULT_WEBHOOK_SIGNATURE_HEADER,
        })

        expect(
          verifyEvent('timestampSchemeVerifier', {
            event,
            payload,
            secret,
          }),
        ).toBeTruthy()
      })

      test('it denies verification when signed with a different secret', () => {
        const signature = signPayload('timestampSchemeVerifier', {
          payload,
          secret: 'WERNER_BRANDES',
        })

        const event = buildEvent({
          payload,
          signature,
          signatureHeader: DEFAULT_WEBHOOK_SIGNATURE_HEADER,
        })

        expect(() => {
          verifyEvent('timestampSchemeVerifier', { event, secret })
        }).toThrow(WebhookVerificationError)
      })

      test('it verifies when within the timestamp tolerance', () => {
        const signature = signPayload('timestampSchemeVerifier', {
          payload,
          secret,
          options: { currentTimestampOverride: Date.now() - TEN_MINUTES },
        })

        const event = buildEvent({
          payload,
          signature,
          signatureHeader: DEFAULT_WEBHOOK_SIGNATURE_HEADER,
        })

        expect(() => {
          verifyEvent('timestampSchemeVerifier', {
            event,
            secret,
            options: { tolerance: FIFTEEN_MINUTES },
          })
        }).toBeTruthy()
      })

      test('it denies verification when verifying with a short tolerance', () => {
        const signature = signPayload('timestampSchemeVerifier', {
          payload,
          secret,
          options: { currentTimestampOverride: Date.now() - TEN_MINUTES },
        })

        const event = buildEvent({
          payload,
          signature,
          signatureHeader: DEFAULT_WEBHOOK_SIGNATURE_HEADER,
        })

        expect(() => {
          verifyEvent('timestampSchemeVerifier', {
            event,
            secret,
            options: { tolerance: 5_000 },
          })
        }).toThrow(WebhookVerificationError)
      })

      test('it denies verification when verifying with a short tolerance also for sha1 verifier', () => {
        const signature = signPayload('sha1Verifier', {
          payload,
          secret,
        })

        const event = buildEvent({
          payload,
          signature,
          signatureHeader: DEFAULT_WEBHOOK_SIGNATURE_HEADER,
        })

        expect(() => {
          verifyEvent('sha1Verifier', {
            event,
            secret,
            options: {
              eventTimestamp: Date.now(),
              currentTimestampOverride: Date.now() - FIFTEEN_MINUTES,
              tolerance: ONE_MINUTE,
            },
          })
        }).toThrow(WebhookVerificationError)
      })
    })

    describe('provider specific tests', () => {
      test('clerk', () => {
        const body =
          '{"data": {"abandon_at": 1648585920141, ' +
          '"client_id": "client_25hz3vm5USqCG3a7jMXqdjzjJyK", ' +
          '"created_at": 1645993920141, "expire_at": 1646598720141, ' +
          '"id": "sess_25hz5CxFyrNJgDO1TY52LGPtM0e", ' +
          '"last_active_at": 1645993920141, "object": "session", ' +
          '"status": "active", "updated_at": 1645993920149, ' +
          '"user_id": "user_25h1zRMh7owJp6us0Sqs3UXwW0y"}, ' +
          '"object": "event", "type": "session.created"}'

        const event = buildEvent({ payload: body })

        event.headers = {
          'svix-signature': 'v1,AaP4EgcpPC5oE3eppI/s6EMtQCZ4Ap34wNHPoxBoikI=',
          'svix-timestamp': '1646004463',
          'svix-id': 'msg_25hz5cPxRz5ilWSQSiYfgxpYHTH',
        }

        const svix_id = event.headers['svix-id']
        const svix_timestamp = event.headers['svix-timestamp']

        const payload = `${svix_id}.${svix_timestamp}.${event.body}`
        const secret = 'whsec_MY_VOICE_IS_MY_PASSPORT_VERIFY_ME'.slice(6)

        expect(
          verifyEvent('base64Sha256Verifier', {
            event,
            secret,
            payload,
            options: {
              signatureHeader: 'svix-signature',
              signatureTransformer: (signature: string) => {
                // Clerk can pass a space separated list of signatures.
                // Let's just use the first one that's of version 1
                const passedSignatures = signature.split(' ')

                for (const versionedSignature of passedSignatures) {
                  const [version, signature] = versionedSignature.split(',')

                  if (version === 'v1') {
                    return signature
                  }
                }
              },
              eventTimestamp: parseInt(svix_timestamp, 10) * 1000,
              // One minute from the event's timestamp is within the default
              // tolerance of five minutes
              currentTimestampOverride:
                parseInt(svix_timestamp, 10) * 1000 - ONE_MINUTE,
            },
          }),
        ).toBeTruthy()
      })
    })
  })
})
