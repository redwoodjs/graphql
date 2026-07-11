import type { APIGatewayProxyEvent, Context } from 'aws-lambda'
import { describe, it, expect } from 'vitest'

import type { Decoded } from '../index'
import { getAuthenticationContext } from '../index'

export const createMockedEvent = (
  headers: Record<string, string>,
): APIGatewayProxyEvent => {
  return {
    body: null,
    headers,
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/MOCK_PATH',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      accountId: 'MOCKED_ACCOUNT',
      apiId: 'MOCKED_API_ID',
      authorizer: { name: 'MOCKED_AUTHORIZER' },
      protocol: 'HTTP',
      identity: {
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        clientCert: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        sourceIp: '123.123.123.123',
        user: null,
        userAgent: null,
        userArn: null,
      },
      httpMethod: 'POST',
      path: '/MOCK_PATH',
      stage: 'MOCK_STAGE',
      requestId: 'MOCKED_REQUEST_ID',
      requestTimeEpoch: 1,
      resourceId: 'MOCKED_RESOURCE_ID',
      resourcePath: 'MOCKED_RESOURCE_PATH',
    },
    resource: 'MOCKED_RESOURCE',
  }
}

describe('getAuthenticationContext with bearer tokens', () => {
  const authDecoderOne = async (_token: string, type: string) => {
    return new Promise<Decoded>((resolve) => {
      if (type !== 'one') {
        return resolve(null)
      }

      return resolve({
        iss: 'one',
        sub: 'user-id',
      })
    })
  }

  it('Can take a single auth decoder for the given provider', async () => {
    const result = await getAuthenticationContext({
      authDecoder: authDecoderOne,
      event: createMockedEvent({
        'auth-provider': 'one',
        authorization: 'Bearer auth-test-token',
      }),
      context: {} as Context,
    })

    if (!result) {
      fail('Result is undefined')
    }

    const [decoded, { type, schema, token }] = result

    expect(decoded).toMatchObject({
      iss: 'one',
      sub: 'user-id',
    })
    expect(type).toEqual('one')
    expect(schema).toEqual('Bearer')
    expect(token).toEqual('auth-test-token')
  })

  it('Can take a single auth decoder for some other provider', async () => {
    const result = await getAuthenticationContext({
      authDecoder: authDecoderOne,
      event: createMockedEvent({
        'auth-provider': 'some-other',
        authorization: 'Bearer auth-test-token',
      }),
      context: {} as Context,
    })

    if (!result) {
      fail('Result is undefined')
    }

    const [decoded, { type, schema, token }] = result

    expect(decoded).toBeNull()
    expect(type).toEqual('some-other')
    expect(schema).toEqual('Bearer')
    expect(token).toEqual('auth-test-token')
  })

  it('Can take an empty array of auth decoders', async () => {
    const result = await getAuthenticationContext({
      authDecoder: [],
      event: createMockedEvent({
        'auth-provider': 'two',
        authorization: 'Bearer auth-test-token',
      }),
      context: {} as Context,
    })

    if (!result) {
      fail('Result is undefined')
    }

    const [decoded, { type, schema, token }] = result

    expect(decoded).toBeNull()
    expect(type).toEqual('two')
    expect(schema).toEqual('Bearer')
    expect(token).toEqual('auth-test-token')
  })

  it('Can take an array of auth decoders', async () => {
    const authDecoderTwo = async (_token: string, type: string) => {
      return new Promise<Decoded>((resolve) => {
        if (type !== 'two') {
          return resolve(null)
        }

        return resolve({
          iss: 'two',
          sub: 'user-id',
        })
      })
    }

    const result = await getAuthenticationContext({
      authDecoder: [authDecoderOne, authDecoderTwo],
      event: createMockedEvent({
        'auth-provider': 'two',
        authorization: 'Bearer auth-test-token',
      }),
      context: {} as Context,
    })

    if (!result) {
      fail('Result is undefined')
    }

    const [decoded, { type, schema, token }] = result

    expect(decoded).toMatchObject({
      iss: 'two',
      sub: 'user-id',
    })
    expect(type).toEqual('two')
    expect(schema).toEqual('Bearer')
    expect(token).toEqual('auth-test-token')
  })

  it('Works even without any auth decoders', async () => {
    const result = await getAuthenticationContext({
      event: createMockedEvent({
        'auth-provider': 'two',
        authorization: 'Bearer auth-test-token',
      }),
      context: {} as Context,
    })

    if (!result) {
      fail('Result is undefined')
    }

    const [decoded, { type, schema, token }] = result

    expect(decoded).toEqual(null)
    expect(type).toEqual('two')
    expect(schema).toEqual('Bearer')
    expect(token).toEqual('auth-test-token')
  })
})

describe('getAuthenticationContext with cookies', () => {
  const authDecoderOne = async (_token: string, type: string) => {
    return new Promise<Decoded>((resolve) => {
      if (type !== 'one') {
        return resolve(null)
      }

      return resolve({
        iss: 'one',
        sub: 'user-id',
      })
    })
  }

  it('Can take a single auth decoder for the given provider', async () => {
    const fetchRequest = new Request('http://localhost:3000', {
      method: 'POST',
      body: '',
      headers: {
        cookie: 'auth-provider=one; session=xx/yy/zz',
      },
    })

    const result = await getAuthenticationContext({
      authDecoder: authDecoderOne,
      event: fetchRequest,
      context: {} as Context,
    })

    if (!result) {
      fail('Result is undefined')
    }

    const [decoded, { type, schema, token }] = result

    expect(decoded).toMatchObject({
      iss: 'one',
      sub: 'user-id',
    })
    expect(type).toEqual('one')
    expect(schema).toEqual('cookie')
    // @TODO we need to rename this. It's not actually the token, because
    // some auth providers will have a cookie where we don't know the key
    expect(token).toEqual('auth-provider=one; session=xx/yy/zz')
  })

  it('Cookie takes precendence over auth header, if both are present', async () => {
    const fetchRequest = new Request('http://localhost:3000', {
      method: 'POST',
      body: '',
      headers: {
        cookie: 'auth-provider=one; session=xx/yy/zz',
        'auth-provider': 'two',
        authorization: 'Bearer im-a-two-token',
      },
    })

    const result = await getAuthenticationContext({
      authDecoder: authDecoderOne,
      event: fetchRequest,
      context: {} as Context,
    })

    if (!result) {
      fail('Result is undefined')
    }

    const [decoded, { type, schema, token }] = result

    expect(decoded).toMatchObject({
      iss: 'one',
      sub: 'user-id',
    })
    expect(type).toEqual('one')
    expect(schema).toEqual('cookie')
    expect(token).toEqual('auth-provider=one; session=xx/yy/zz')
  })
})
