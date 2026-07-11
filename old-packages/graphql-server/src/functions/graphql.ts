import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context as LambdaContext,
} from 'aws-lambda'

import type { GlobalContext } from '@redwoodjs/context'
import { getAsyncStoreInstance } from '@redwoodjs/context/dist/store'

import { createGraphQLYoga } from '../createGraphQLYoga'
import type { GraphQLHandlerOptions } from '../types'

/**
 * Creates an Enveloped GraphQL Server, configured with default Redwood plugins
 *
 * You can add your own plugins by passing them to the extraPlugins object
 *
 * @see https://www.envelop.dev/ for information about envelop
 * @see https://www.envelop.dev/plugins for available envelop plugins
 * ```js
 * export const handler = createGraphQLHandler({ schema, context, getCurrentUser })
 * ```
 */
export const createGraphQLHandler = ({
  healthCheckId,
  loggerConfig,
  context,
  getCurrentUser,
  onException,
  generateGraphiQLHeader,
  extraPlugins,
  authDecoder,
  cors,
  services,
  sdls,
  directives = [],
  armorConfig,
  allowedOperations,
  allowIntrospection,
  allowGraphiQL,
  defaultError = 'Something went wrong.',
  graphiQLEndpoint = '/graphql',
  schemaOptions,
  openTelemetryOptions,
  trustedDocuments,
}: GraphQLHandlerOptions) => {
  const { yoga, logger } = createGraphQLYoga({
    healthCheckId,
    loggerConfig,
    context,
    getCurrentUser,
    onException,
    generateGraphiQLHeader,
    extraPlugins,
    authDecoder,
    cors,
    services,
    sdls,
    directives,
    armorConfig,
    allowedOperations,
    allowIntrospection,
    allowGraphiQL,
    defaultError,
    graphiQLEndpoint,
    schemaOptions,
    openTelemetryOptions,
    trustedDocuments,
  })

  const handlerFn = async (
    event: APIGatewayProxyEvent,
    requestContext: LambdaContext,
  ): Promise<APIGatewayProxyResult> => {
    // In the future, this could be part of a specific handler for AWS lambdas
    requestContext.callbackWaitsForEmptyEventLoop = false

    let lambdaResponse: APIGatewayProxyResult
    try {
      // url needs to be normalized
      const [, rest = ''] = event.path.split(graphiQLEndpoint)
      const url = new URL(graphiQLEndpoint + rest, 'http://localhost')

      if (event.queryStringParameters != null) {
        for (const queryName in event.queryStringParameters) {
          const queryValue = event.queryStringParameters[queryName]
          if (queryValue != null) {
            url.searchParams.set(queryName, queryValue)
          }
        }
      }

      const response = await yoga.fetch(
        url,
        {
          method: event.httpMethod,
          headers: event.headers as HeadersInit,
          body: event.body
            ? Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8')
            : undefined,
        },
        {
          event,
          requestContext,
        },
      )

      // @WARN - multivalue headers aren't supported on all deployment targets correctly
      // Netlify ✅, Vercel 🛑, AWS ✅,...
      // From https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
      // If you specify values for both headers and multiValueHeaders, API Gateway merges them into a single list.
      const responseHeaders: Record<string, string> = {}

      // @ts-expect-error - https://github.com/ardatan/whatwg-node/issues/574
      response.headers.forEach((value, name) => {
        responseHeaders[name] = value
      })

      lambdaResponse = {
        body: await response.text(),
        statusCode: response.status,
        headers: responseHeaders,
        isBase64Encoded: false,
      }
    } catch (e: any) {
      logger.error(e)
      if (onException) {
        onException()
      }

      lambdaResponse = {
        body: JSON.stringify({ error: 'GraphQL execution failed' }),
        statusCode: 200, // should be 500
      }
    }

    if (!lambdaResponse.headers) {
      lambdaResponse.headers = {}
    }

    /**
     * The header keys are case insensitive, but Fastify prefers these to be lowercase.
     * Therefore, we want to ensure that the headers are always lowercase and unique
     * for compliance with HTTP/2.
     *
     * @see: https://www.rfc-editor.org/rfc/rfc7540#section-8.1.2
     */
    // DT: Yoga v3 uses `application/graphql-response+json; charset=utf-8`
    // But we still do want to make sure the header is lowercase.
    // Comment out for now since GraphiQL doesn't work with this header anymore
    // because it loads its UI from a CDN and needs text/html to be the response type
    // lambdaResponse.headers['content-type'] = 'application/json'
    return lambdaResponse
  }

  return (
    event: APIGatewayProxyEvent,
    context: LambdaContext,
  ): Promise<any> => {
    const execFn = async () => {
      try {
        return await handlerFn(event, context)
      } catch (e) {
        if (onException) {
          onException()
        }

        throw e
      }
    }
    return getAsyncStoreInstance().run(new Map<string, GlobalContext>(), execFn)
  }
}
