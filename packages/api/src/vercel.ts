import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context as LambdaContext,
} from 'aws-lambda'

// This function is duplicated from @redwoodjs/api-server. We should find a way
// to share it, but for now this is the easiest solution.
export const mergeMultiValueHeaders = (
  headers: { [name: string]: string } | undefined,
  multiValueHeaders: { [name: string]: string[] } | undefined,
) => {
  const mergedHeaders: { [name: string]: string[] } = {}

  // Convert headers to multi-value headers
  if (headers) {
    for (const [name, value] of Object.entries(headers)) {
      mergedHeaders[name.toLowerCase()] = [value]
    }
  }

  // Merge multi-value headers
  if (multiValueHeaders) {
    for (const [name, values] of Object.entries(multiValueHeaders)) {
      mergedHeaders[name.toLowerCase()] = [
        ...(mergedHeaders[name.toLowerCase()] || []),
        ...values,
      ]
    }
  }

  return mergedHeaders
}

export function lambdaResponseToWebResponse(
  lambdaResponse: APIGatewayProxyResult,
): Response {
  const {
    statusCode = 200,
    headers,
    body = '',
    multiValueHeaders,
    isBase64Encoded,
  } = lambdaResponse

  const mergedHeaders = mergeMultiValueHeaders(headers, multiValueHeaders)

  // Vercel edge functions don't support buffer
  // But they do support string, blob, etc.
  const responseBody = isBase64Encoded
    ? atob(body) // atob is available in edge runtimes
    : body

  return new Response(responseBody, {
    status: statusCode,
    headers: mergedHeaders,
  })
}

export async function webRequestToLambdaEvent(
  request: Request,
  context?: LambdaContext, // Optional context from Vercel
): Promise<APIGatewayProxyEvent> {
  const url = new URL(request.url)
  const headers: Record<string, string> = {}
  request.headers.forEach((value, key) => {
    headers[key] = value
  })

  const queryStringParameters: Record<string, string> = {}
  const multiValueQueryStringParameters: Record<string, string[]> = {}

  for (const [key, value] of url.searchParams.entries()) {
    // The first value for a key becomes the single value
    if (queryStringParameters[key] === undefined) {
      queryStringParameters[key] = value
    }

    if (!multiValueQueryStringParameters[key]) {
      multiValueQueryStringParameters[key] = []
    }
    multiValueQueryStringParameters[key].push(value)
  }

  // Vercel seems to add this header
  const sourceIp = headers['x-real-ip'] || '127.0.0.1'

  const body = await request.text()

  return {
    httpMethod: request.method,
    headers: headers,
    path: url.pathname,
    queryStringParameters,
    multiValueQueryStringParameters,
    requestContext: {
      requestId: headers['x-vercel-id'] || context?.awsRequestId || '',
      identity: {
        sourceIp: sourceIp,
        // Other identity properties can be added here if available from Vercel
      },
      // The rest of the request context can be filled with mock or available data
      accountId: 'mock-account-id',
      apiId: 'mock-api-id',
      authorizer: {},
      domainName: url.hostname,
      domainPrefix: url.hostname.split('.')[0],
      extendedRequestId: headers['x-vercel-id'] || '',
      httpMethod: request.method,
      path: url.pathname,
      protocol: 'HTTP/1.1',
      stage: 'prod',
      requestTime: new Date().toISOString(),
      requestTimeEpoch: Date.now(),
      resourceId: 'mock-resource-id',
      resourcePath: url.pathname,
    },
    body: body,
    isBase64Encoded: false, // Assuming body is not base64 encoded from web request
    multiValueHeaders: {}, // Can be built from request.headers if needed
    stageVariables: null,
    resource: '',
  }
}
