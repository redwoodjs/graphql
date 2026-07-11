import type { APIGatewayProxyEvent } from 'aws-lambda'
import { test, expect, describe } from 'vitest'

import { parseAuthorizationHeader } from '../index'

describe('parseAuthorizationHeader', () => {
  test('throws error if Authorization header is not valid', () => {
    const invalidHeaders = [
      undefined,
      null,
      '',
      'Bearer',
      'Bearer ',
      'Bearer token with spaces',
      'Token',
      'Token ',
      'Token token with spaces',
    ]

    invalidHeaders.forEach((header) => {
      expect(() =>
        // @ts-expect-error That's what we're testing
        parseAuthorizationHeader({ headers: { Authorization: header } }),
      ).toThrowError('The `Authorization` header is not valid.')
    })
  })

  test('returns the schema and token from valid Authorization header', () => {
    const validHeaders = [
      'Bearer token',
      'Bearer 12345',
      'Token token',
      'Token 12345',
    ]

    validHeaders.forEach((header) => {
      // We only care about the headers in the event
      const result = parseAuthorizationHeader({
        headers: { Authorization: header },
      } as unknown as APIGatewayProxyEvent)

      expect(result).toEqual({
        schema: header.split(' ')[0],
        token: header.split(' ')[1],
      })
    })
  })

  test('Handles different lower-casing of the authorization header', () => {
    const result = parseAuthorizationHeader({
      headers: { authorization: 'Bearer bazinga' },
    } as unknown as APIGatewayProxyEvent)

    expect(result).toEqual({
      schema: 'Bearer',
      token: 'bazinga',
    })
  })

  test('Handles different capital-casing of the Authorization header', () => {
    const result = parseAuthorizationHeader({
      headers: { Authorization: 'Bearer bazinga' },
    } as unknown as APIGatewayProxyEvent)

    expect(result).toEqual({
      schema: 'Bearer',
      token: 'bazinga',
    })
  })
})
