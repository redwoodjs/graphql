import type { APIGatewayProxyEvent, Context as LambdaContext } from 'aws-lambda'
// @ts-expect-error - The types don't have a `default` export, but the actual
// module will do at runtime
import jwt from 'jsonwebtoken'
import { vi, beforeAll, afterAll, test, expect } from 'vitest'

import { authDecoder } from '../decoder'

vi.mock('jsonwebtoken', async (importOriginal) => {
  const originalJWT = await importOriginal<typeof jwt>()

  return {
    ...originalJWT,
    default: {
      verify: vi.fn(),
      decode: vi.fn((token: string) => {
        const exp =
          token === 'expired-token'
            ? Math.floor(Date.now() / 1000) - 3600
            : Math.floor(Date.now() / 1000) + 3600

        return { exp, sub: 'abc123' }
      }),
    },
    TokenExpiredError: originalJWT.TokenExpiredError,
  }
})

const req = {
  event: {} as APIGatewayProxyEvent,
  context: {} as LambdaContext,
}

let consoleError: typeof console.error

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

test('in production it uses req data', async () => {
  const NODE_ENV = process.env.NODE_ENV
  process.env.NODE_ENV = 'production'

  const decoded = await authDecoder('token', 'netlify', {
    ...req.event,
    context: { clientContext: { user: { sub: 'abc123' } } },
  } as any)

  expect(jwt.decode).not.toBeCalled()
  expect(jwt.verify).not.toBeCalled()
  expect(decoded?.sub === 'abc123')

  process.env.NODE_ENV = NODE_ENV
})

test('in dev and test it uses jwt.decode', async () => {
  const decoded = await authDecoder('token', 'netlify', {
    ...req.event,
    context: { clientContext: { user: { sub: 'abc123' } } },
  } as any)

  expect(jwt.decode).toBeCalled()
  expect(jwt.verify).not.toBeCalled()
  expect(decoded?.sub === 'abc123')
})

test('throws on expired token', async () => {
  expect(
    authDecoder('expired-token', 'netlify', {
      ...req.event,
      context: { clientContext: { user: { sub: 'abc123' } } },
    } as any),
  ).rejects.toThrow('jwt expired')
})
