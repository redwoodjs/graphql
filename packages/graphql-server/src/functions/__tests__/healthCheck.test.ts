import type { APIGatewayProxyEvent, Context } from 'aws-lambda'
import { vi, describe, expect, it } from 'vitest'

import { createLogger } from '@redwoodjs/api/logger'

import { createGraphQLHandler } from '../../functions/graphql'

vi.mock('../../makeMergedSchema', () => {
  const { makeExecutableSchema } = require('@graphql-tools/schema')

  // Return executable schema
  return {
    makeMergedSchema: () =>
      makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            me: User!
          }

          type User {
            id: ID!
            name: String!
          }
        `,
        resolvers: {
          Query: {
            me: () => {
              return { _id: 1, firstName: 'Ba', lastName: 'Zinga' }
            },
          },
        },
      }),
  }
})

vi.mock('../../directives/makeDirectives', () => {
  return {
    makeDirectivesForPlugin: () => [],
  }
})

interface MockLambdaParams {
  headers?: { [key: string]: string }
  body?: string | null
  httpMethod: string
  [key: string]: any
}

const mockLambdaEvent = ({
  headers,
  body = null,
  httpMethod,
  ...others
}: MockLambdaParams): APIGatewayProxyEvent => {
  return {
    headers: headers || {},
    body,
    httpMethod,
    multiValueQueryStringParameters: null,
    isBase64Encoded: false,
    multiValueHeaders: {}, // this is silly - the types require a value. It definitely can be undefined, e.g. on Vercel.
    path: '/graphql',
    pathParameters: null,
    stageVariables: null,
    queryStringParameters: null,
    requestContext: null as any,
    resource: null as any,
    ...others,
  }
}

describe('GraphQL Health Check', () => {
  describe('when making check with the default health check id', () => {
    it('returns ok, and the header has the default health check id', async () => {
      const handler = createGraphQLHandler({
        loggerConfig: { logger: createLogger({}), options: {} },
        sdls: {},
        directives: {},
        services: {},
        onException: () => {},
      })

      const mockedEvent = mockLambdaEvent({
        headers: {
          'Content-Type': 'application/json',
        },
        path: '/graphql/health',
        httpMethod: 'GET',
      })

      const response = await handler(mockedEvent, {} as Context)

      expect(response.headers['x-yoga-id']).toBe('yoga')
      expect(response.statusCode).toBe(200)
    })
  })

  describe('when making check with a custom health check id', () => {
    it('returns ok, and the header has the custom health check id', async () => {
      const handler = createGraphQLHandler({
        healthCheckId: 'custom-redwood-health-check',
        loggerConfig: { logger: createLogger({}), options: {} },
        sdls: {},
        directives: {},
        services: {},
        onException: () => {},
      })

      const mockedEvent = mockLambdaEvent({
        headers: {
          'Content-Type': 'application/json',
        },
        path: '/graphql/health',
        httpMethod: 'GET',
      })

      const response = await handler(mockedEvent, {} as Context)

      expect(response.headers['x-yoga-id']).toBe('custom-redwood-health-check')
      expect(response.statusCode).toBe(200)
    })
  })
})
