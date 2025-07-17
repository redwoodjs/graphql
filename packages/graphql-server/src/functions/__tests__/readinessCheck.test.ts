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

describe('GraphQL Readiness Check', () => {
  describe('when making a check for the default health check id to determine readiness', () => {
    it('returns ok', async () => {
      const handler = createGraphQLHandler({
        loggerConfig: { logger: createLogger({}), options: {} },
        sdls: {},
        directives: {},
        services: {},
        onException: () => {},
      })

      const mockedEvent = mockLambdaEvent({
        headers: {
          'x-yoga-id': 'yoga',
          'Content-Type': 'application/json',
        },
        path: '/graphql/readiness',
        httpMethod: 'GET',
      })

      const response = await handler(mockedEvent, {} as Context)

      expect(response.statusCode).toBe(200)
    })

    it('returns 503 if the default health check id does not match', async () => {
      const handler = createGraphQLHandler({
        loggerConfig: { logger: createLogger({}), options: {} },
        sdls: {},
        directives: {},
        services: {},
        onException: () => {},
      })

      const mockedEvent = mockLambdaEvent({
        headers: {
          'x-yoga-id': 'wrong-custom-health-check-id',
          'Content-Type': 'application/json',
        },
        path: '/graphql/readiness',
        httpMethod: 'GET',
      })

      const response = await handler(mockedEvent, {} as Context)

      expect(response.statusCode).toBe(503)
    })
  })

  describe('when making a check with a custom health check id to determine readiness', () => {
    it('returns ok', async () => {
      const handler = createGraphQLHandler({
        healthCheckId: 'custom-health-check-id',
        loggerConfig: { logger: createLogger({}), options: {} },
        sdls: {},
        directives: {},
        services: {},
        onException: () => {},
      })

      const mockedEvent = mockLambdaEvent({
        headers: {
          'x-yoga-id': 'custom-health-check-id',
          'Content-Type': 'application/json',
        },
        path: '/graphql/readiness',
        httpMethod: 'GET',
      })

      const response = await handler(mockedEvent, {} as Context)

      expect(response.statusCode).toBe(200)
    })

    it('returns 503 if the health check id does not match', async () => {
      const handler = createGraphQLHandler({
        healthCheckId: 'custom-health-check-id',
        loggerConfig: { logger: createLogger({}), options: {} },
        sdls: {},
        directives: {},
        services: {},
        onException: () => {},
      })

      const mockedEvent = mockLambdaEvent({
        headers: {
          'x-yoga-id': 'wrong-custom-health-check-id',
          'Content-Type': 'application/json',
        },
        path: '/graphql/readiness',
        httpMethod: 'GET',
      })

      const response = await handler(mockedEvent, {} as Context)

      expect(response.statusCode).toBe(503)
    })
  })
})
