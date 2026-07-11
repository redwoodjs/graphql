import type { APIGatewayProxyEvent, Context } from 'aws-lambda'
import { CurrencyDefinition, CurrencyResolver } from 'graphql-scalars'
import { vi, describe, expect, it } from 'vitest'

import type {
  RedwoodError as RedwoodErrorType,
  EmailValidationError as EmailValidationErrorType,
} from '@redwoodjs/api'
import { createLogger } from '@redwoodjs/api/logger'

import { createGraphQLHandler } from '../../functions/graphql'

vi.mock('../../makeMergedSchema', () => {
  const { createGraphQLError } = require('graphql-yoga')
  const { makeExecutableSchema } = require('@graphql-tools/schema')
  const {
    ForbiddenError,
    RedwoodGraphQLError,
  } = require('@redwoodjs/graphql-server/dist/errors')

  const { CurrencyResolver } = require('graphql-scalars')
  const { RedwoodError, EmailValidationError } = require('@redwoodjs/api') as {
    RedwoodError: typeof RedwoodErrorType
    EmailValidationError: typeof EmailValidationErrorType
  }

  class WeatherError extends RedwoodError {
    constructor(message: string, extensions?: Record<string, any>) {
      super(message, extensions)
    }
  }

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

          type Query {
            forbiddenUser: User!
            getUser(id: Int!): User!
            invalidUser: User!
            unexpectedUser: User!
            graphQLErrorUser: User!
            redwoodGraphQLErrorUser: User!
          }

          scalar Currency

          type Product {
            id: Int!
            name: String!
            currency_iso_4217: Currency!
          }

          type Query {
            products: [Product!]!
            invalidProducts: [Product!]!
          }

          type Weather {
            temperature: Int!
          }

          type Query {
            weather: Weather!
          }
        `,
        resolvers: {
          Currency: CurrencyResolver,
          Query: {
            me: () => {
              return { _id: 1, firstName: 'Ba', lastName: 'Zinga' }
            },
            forbiddenUser: () => {
              throw new ForbiddenError('You are forbidden')
            },
            graphQLErrorUser: () => {
              throw createGraphQLError('You are forbidden by a GraphQLError')
            },
            redwoodGraphQLErrorUser: () => {
              throw new RedwoodGraphQLError(
                'You are forbidden by a RedwoodGraphQLError',
              )
            },
            invalidUser: () => {
              throw new EmailValidationError('emailmissingatexample.com')
            },
            unexpectedUser: () => {
              throw new Error(
                'Connection to database failed at 192.168.1 port 5678',
              )
            },
            getUser: (id) => {
              return { id, firstName: 'Ba', lastName: 'Zinga' }
            },
            products: () => {
              return [{ id: 1, name: 'Product 1', currency_iso_4217: 'USD' }]
            },
            invalidProducts: () => {
              return [
                {
                  id: 2,
                  name: 'Product 2',
                  currency_iso_4217: 'Calamari flan',
                },
              ]
            },
            weather: () => {
              throw new WeatherError('Check outside instead', {
                code: 'RATE_LIMIT',
              })
            },
          },
          User: {
            id: (u) => u._id,
            name: (u) => `${u.firstName} ${u.lastName}`,
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

describe('useRedwoodError', () => {
  describe('when masking errors', () => {
    it('returns data when there is no error', async () => {
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
        body: JSON.stringify({ query: '{ me { id, name } }' }),
        httpMethod: 'POST',
      })

      const response = await handler(mockedEvent, {} as Context)
      const { data } = JSON.parse(response.body)

      expect(response.statusCode).toBe(200)
      expect(data).toEqual({ me: { id: '1', name: 'Ba Zinga' } })
    })

    it('returns an unmasked error message when the request is forbidden', async () => {
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
        body: JSON.stringify({ query: '{ forbiddenUser { id, name } }' }),
        httpMethod: 'POST',
      })

      const response = await handler(mockedEvent, {} as Context)
      const { data, errors } = JSON.parse(response.body)

      expect(data).toBeNull()
      expect(errors[0].message).toEqual('You are forbidden')
    })

    it('masks the error message when the request has an unexpected error', async () => {
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
        body: JSON.stringify({ query: '{ unexpectedUser { id, name } }' }),
        httpMethod: 'POST',
      })

      const response = await handler(mockedEvent, {} as Context)
      const { data, errors } = JSON.parse(response.body)

      expect(data).toBeNull()
      expect(errors[0].message).toEqual('Something went wrong.')
    })

    it('masks the error message when the request has an unexpected error with a custom message', async () => {
      const handler = createGraphQLHandler({
        loggerConfig: { logger: createLogger({}), options: {} },
        sdls: {},
        directives: {},
        services: {},
        defaultError: 'Please try again.',
        onException: () => {},
      })

      const mockedEvent = mockLambdaEvent({
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: '{ unexpectedUser { id, name } }' }),
        httpMethod: 'POST',
      })

      const response = await handler(mockedEvent, {} as Context)
      const { data, errors } = JSON.parse(response.body)

      expect(data).toBeNull()
      expect(errors[0].message).toEqual('Please try again.')
    })

    describe('with Service Validation errors', () => {
      it('Service', async () => {
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
          body: JSON.stringify({ query: '{ invalidUser { id, name } }' }),
          httpMethod: 'POST',
        })

        const response = await handler(mockedEvent, {} as Context)
        const { data, errors } = JSON.parse(response.body)

        expect(response.statusCode).toBe(200)
        expect(data).toBeNull()
        expect(errors[0].message).toContain(
          'Emailmissingatexample.com must be formatted',
        )
      })
    })

    describe('with a RedwoodGraphQLError', () => {
      it('does not mask error message', async () => {
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
          body: JSON.stringify({
            query: '{ redwoodGraphQLErrorUser { id, name } }',
          }),
          httpMethod: 'POST',
        })

        const response = await handler(mockedEvent, {} as Context)
        const { data, errors } = JSON.parse(response.body)

        expect(response.statusCode).toBe(200)
        expect(data).toBeNull()
        expect(errors[0].message).toContain(
          'You are forbidden by a RedwoodGraphQLError',
        )
      })
    })

    describe('with a GraphQLError', () => {
      it('does not mask error message', async () => {
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
          body: JSON.stringify({
            query: '{ graphQLErrorUser { id, name } }',
          }),
          httpMethod: 'POST',
        })

        const response = await handler(mockedEvent, {} as Context)
        const { data, errors } = JSON.parse(response.body)

        expect(response.statusCode).toBe(200)
        expect(data).toBeNull()
        expect(errors[0].message).toContain(
          'You are forbidden by a GraphQLError',
        )
      })
    })

    describe('with Custom Scalar type errors', () => {
      it('returns data when there is a valid scalar currency', async () => {
        const handler = createGraphQLHandler({
          loggerConfig: { logger: createLogger({}), options: {} },
          sdls: {},
          directives: {},
          services: {},
          schemaOptions: {
            typeDefs: [CurrencyDefinition],
            resolvers: { Currency: CurrencyResolver },
          },
          onException: () => {},
        })

        const mockedEvent = mockLambdaEvent({
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: '{ products { id, name, currency_iso_4217 } }',
          }),
          httpMethod: 'POST',
        })

        const response = await handler(mockedEvent, {} as Context)
        const { data, errors } = JSON.parse(response.body)

        expect(errors).toBeUndefined()
        expect(data.products[0].currency_iso_4217).toEqual('USD')
      })

      it('masks a custom scalar currency type runtime validation error message', async () => {
        const handler = createGraphQLHandler({
          loggerConfig: { logger: createLogger({}), options: {} },
          sdls: {},
          directives: {},
          services: {},
          schemaOptions: {
            typeDefs: [CurrencyDefinition],
            resolvers: { Currency: CurrencyResolver },
          },
          onException: () => {},
        })

        const mockedEvent = mockLambdaEvent({
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: '{ invalidProducts { id, name, currency_iso_4217 } }',
          }),
          httpMethod: 'POST',
        })

        const response = await handler(mockedEvent, {} as Context)
        const { data, errors } = JSON.parse(response.body)

        expect(data).toBeNull()
        expect(errors[0].message).toEqual('Something went wrong.')
      })
    })

    describe('with Custom Redwood Error', () => {
      it('shows the custom error message', async () => {
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
          body: JSON.stringify({
            query: '{ weather { temperature } }',
          }),
          httpMethod: 'POST',
        })

        const response = await handler(mockedEvent, {} as Context)
        const { data, errors } = JSON.parse(response.body)

        expect(data).toBeNull()
        expect(errors[0].message).toEqual('Check outside instead')
      })
    })
  })
})
