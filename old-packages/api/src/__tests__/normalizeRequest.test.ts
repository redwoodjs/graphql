import { Headers } from '@whatwg-node/fetch'
import type { APIGatewayProxyEvent } from 'aws-lambda'
import { test, expect, describe } from 'vitest'

import { normalizeRequest } from '../transforms'

export const createMockedLambdaEvent = (
  httpMethod = 'POST',
  body: any = undefined,
  isBase64Encoded = false,
): APIGatewayProxyEvent => {
  return {
    body,
    headers: {},
    multiValueHeaders: {},
    httpMethod,
    isBase64Encoded,
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

describe('Lambda Request', () => {
  test('Normalizes an aws event with base64', async () => {
    const corsEventB64 = createMockedLambdaEvent(
      'POST',
      Buffer.from(JSON.stringify({ bazinga: 'hello_world' }), 'utf8').toString(
        'base64',
      ),
      true,
    )

    expect(await normalizeRequest(corsEventB64)).toEqual({
      headers: new Headers(corsEventB64.headers as Record<string, string>),
      method: 'POST',
      query: null,
      jsonBody: {
        bazinga: 'hello_world',
      },
    })
  })

  test('Handles CORS requests with and without b64 encoded', async () => {
    const corsEventB64 = createMockedLambdaEvent('OPTIONS', undefined, true)

    expect(await normalizeRequest(corsEventB64)).toEqual({
      headers: new Headers(corsEventB64.headers as Record<string, string>), // headers returned as symbol
      method: 'OPTIONS',
      query: null,
      jsonBody: {},
    })

    const corsEventWithoutB64 = createMockedLambdaEvent(
      'OPTIONS',
      undefined,
      false,
    )

    expect(await normalizeRequest(corsEventWithoutB64)).toEqual({
      headers: new Headers(corsEventB64.headers as Record<string, string>), // headers returned as symbol
      method: 'OPTIONS',
      query: null,
      jsonBody: {},
    })
  })
})

describe('Fetch API Request', () => {
  test('Normalizes a fetch event', async () => {
    const fetchEvent = new Request(
      'http://localhost:9210/graphql?whatsup=doc&its=bugs',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ bazinga: 'kittens_purr_purr' }),
      },
    )

    const partial = await normalizeRequest(fetchEvent)

    expect(partial).toMatchObject({
      // headers: fetchEvent.headers,
      method: 'POST',
      query: {
        whatsup: 'doc',
        its: 'bugs',
      },
      jsonBody: {
        bazinga: 'kittens_purr_purr',
      },
    })

    expect(partial.headers.get('content-type')).toEqual('application/json')
  })

  test('Handles an empty body', async () => {
    const headers = {
      'content-type': 'application/json',
      'x-custom-header': 'bazinga',
    }

    const fetchEvent = new Request(
      'http://localhost:9210/graphql?whatsup=doc&its=bugs',
      {
        method: 'PUT',
        headers,
        body: '',
      },
    )

    const partial = await normalizeRequest(fetchEvent)

    expect(partial).toMatchObject({
      method: 'PUT',
      query: {
        whatsup: 'doc',
        its: 'bugs',
      },
      jsonBody: {}, // @NOTE empty body is {} not undefined
    })

    expect(partial.headers.get('content-type')).toEqual(headers['content-type'])
    expect(partial.headers.get('x-custom-header')).toEqual('bazinga')
  })
})
