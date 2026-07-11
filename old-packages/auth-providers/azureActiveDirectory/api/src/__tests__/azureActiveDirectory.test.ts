import type { APIGatewayProxyEvent, Context as LambdaContext } from 'aws-lambda'
import jwt from 'jsonwebtoken'
import { vi, test, beforeAll, afterAll, expect, describe } from 'vitest'

import { authDecoder } from '../decoder'

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(),
    decode: vi.fn(),
  },
}))

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
  const decoded = await authDecoder('token', 'netlify', req)

  expect(decoded).toBe(null)
})

test('throws if AZURE_ACTIVE_DIRECTORY_AUTHORITY env var is not set', async () => {
  delete process.env.AZURE_ACTIVE_DIRECTORY_AUTHORITY
  process.env.AZURE_ACTIVE_DIRECTORY_JTW_ISSUER = 'jwt-issuer'

  await expect(
    authDecoder('token', 'azureActiveDirectory', req),
  ).rejects.toThrow('AZURE_ACTIVE_DIRECTORY_AUTHORITY env var is not set')
})

describe('invoking in prod', () => {
  let NODE_ENV

  beforeAll(() => {
    NODE_ENV = process.env.NODE_ENV
    process.env.AZURE_ACTIVE_DIRECTORY_AUTHORITY = 'authority'
    process.env.AZURE_ACTIVE_DIRECTORY_JTW_ISSUER = 'jwt-issuer'
  })

  afterAll(() => {
    process.env.NODE_ENV = NODE_ENV
  })

  test('verify, not decode, is called in production', async () => {
    process.env.NODE_ENV = 'production'

    authDecoder('token', 'azureActiveDirectory', req)

    expect(jwt.decode).not.toBeCalled()
    expect(jwt.verify).toBeCalled()
  })
})
