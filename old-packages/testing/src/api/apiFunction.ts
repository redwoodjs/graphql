import type {
  APIGatewayProxyEvent,
  APIGatewayProxyEventHeaders,
  Context,
} from 'aws-lambda'

import type { SupportedVerifierTypes } from '@redwoodjs/api/webhooks'
import { signPayload } from '@redwoodjs/api/webhooks'

interface BuildEventParams extends Partial<APIGatewayProxyEvent> {
  payload?: string | null | Record<any, any>
  signature?: string
  signatureHeader?: string
  headers?: APIGatewayProxyEventHeaders
}

/**
 * @description Use this to mock out the http request event that is received by your function in unit tests
 *
 * @example Mocking sending headers
 * mockHttpEvent({header: {'X-Custom-Header': 'bazinga'}})
 *
 * @example Adding a JSON payload
 * mockHttpEvent({payload: JSON.stringify(mockedRequestBody)})
 *
 * @returns APIGatewayProxyEvent
 */
export const mockHttpEvent = ({
  payload = null,
  signature,
  signatureHeader,
  queryStringParameters = null,
  httpMethod = 'GET',
  headers = {},
  path = '',
  isBase64Encoded = false,
  ...others
}: BuildEventParams): APIGatewayProxyEvent => {
  if (signature && signatureHeader) {
    headers[signatureHeader.toLocaleLowerCase()] = signature
  }

  const payloadAsString =
    typeof payload === 'string' ? payload : JSON.stringify(payload)

  const body =
    payload === null
      ? null
      : isBase64Encoded
        ? Buffer.from(payloadAsString || '').toString('base64')
        : payloadAsString

  return {
    body,
    headers,
    multiValueHeaders: {},
    isBase64Encoded,
    path,
    pathParameters: null,
    stageVariables: null,
    httpMethod,
    queryStringParameters,
    // @ts-expect-error not required for mocks
    requestContext: null,
    // @ts-expect-error not required for mocks
    resource: null,
    multiValueQueryStringParameters: null,
    ...others,
  }
}

/**
 * @description Use this function to mock the http event's context
 * @see: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-context.html
 **/
export const mockContext = (): Context => {
  const context = {} as Context

  return context
}

interface MockedSignedWebhookParams
  extends Omit<BuildEventParams, 'signature' | 'signatureHeader'> {
  signatureType: Exclude<SupportedVerifierTypes, 'skipVerifier'>
  signatureHeader: string // make this required
  secret: string
}

/**
 * @description Use this function to mock a signed webhook
 * @see https://redwoodjs.com/docs/webhooks#webhooks
 **/
export const mockSignedWebhook = ({
  payload = null,
  signatureType,
  signatureHeader,
  secret,
  ...others
}: MockedSignedWebhookParams) => {
  const payloadAsString =
    typeof payload === 'string' ? payload : JSON.stringify(payload)

  const signature = signPayload(signatureType, {
    payload: payloadAsString,
    secret,
  })

  return mockHttpEvent({
    payload,
    signature,
    signatureHeader,
    ...others,
  })
}
