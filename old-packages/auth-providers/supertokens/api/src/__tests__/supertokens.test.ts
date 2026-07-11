import type { APIGatewayProxyEvent, Context as LambdaContext } from 'aws-lambda'
import jwt from 'jsonwebtoken'
import { vi, beforeAll, afterAll, test, expect } from 'vitest'

import { authDecoder } from '../decoder'

vi.mock('jsonwebtoken', () => {
  return {
    default: {
      verify: vi.fn(),
      decode: vi.fn(),
    },
  }
})

const req = {
  event: {} as APIGatewayProxyEvent,
  context: {} as LambdaContext,
}

let consoleError

beforeAll(() => {
  consoleError = console.error
  console.error = () => {}
})

afterAll(() => {
  console.error = consoleError
})

test('returns null for unsupported type', async () => {
  const decoded = await authDecoder('token', 'clerk', req)

  expect(decoded).toBe(null)
})

test('throws if SUPERTOKENS_JWKS_URL env var is not set', async () => {
  delete process.env.SUPERTOKENS_JWKS_URL

  await expect(authDecoder('token', 'supertokens', req)).rejects.toThrow(
    'SUPERTOKENS_JWKS_URL env var is not set',
  )
})

test('uses verify', () => {
  process.env.SUPERTOKENS_JWKS_URL = 'jwks-url'

  authDecoder('token', 'supertokens', req)

  expect(jwt.verify).toHaveBeenCalled()
})
