import type { APIGatewayProxyEvent, Context as LambdaContext } from 'aws-lambda'
import { beforeAll, afterAll, describe, test, expect } from 'vitest'

import { authDecoder, clerkAuthDecoder } from '../decoder'

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

describe('deprecated authDecoder', () => {
  test('returns null for unsupported type', async () => {
    const decoded = await authDecoder('token', 'netlify', req)

    expect(decoded).toBe(null)
  })

  test('rejects when the token is invalid', async () => {
    process.env.CLERK_JWT_KEY = 'jwt-key'

    await expect(authDecoder('invalid-token', 'clerk', req)).rejects.toThrow()
  })
})

describe('clerkAuthDecoder', () => {
  test('returns null for unsupported type', async () => {
    const decoded = await clerkAuthDecoder('token', 'netlify', req)

    expect(decoded).toBe(null)
  })

  test('rejects when the token is invalid', async () => {
    process.env.CLERK_JWT_KEY = 'jwt-key'

    await expect(
      clerkAuthDecoder('invalid-token', 'clerk', req),
    ).rejects.toThrow()
  })
})
