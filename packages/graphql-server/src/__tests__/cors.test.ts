import type { APIGatewayProxyEvent, Context } from 'aws-lambda'
import { vi, describe, expect, it } from 'vitest'

import { createLogger } from '@redwoodjs/api/logger'

import { createGraphQLHandler } from '../functions/graphql'

interface User {
  _id: number
  firstName: string
  lastName: string
}

vi.mock('../makeMergedSchema', () => {
  const { makeExecutableSchema } = require('@graphql-tools/schema')
  // Return executable schema
  return {
    makeMergedSchema: () =>
      makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            me: User!
          }

          type Query {
            forbiddenUser: User!
            getUser(id: Int!): User!
          }

          type User {
            id: ID!
            name: String!
          }
        `,
        resolvers: {
          Query: {
            me: (): User => {
              return { _id: 1, firstName: 'Ba', lastName: 'Zinga' }
            },
            forbiddenUser: () => {
              throw Error('You are forbidden')
            },
            getUser: (id: number) => {
              return { id, firstName: 'Ba', lastName: 'Zinga' }
            },
          },
          User: {
            id: (u: User) => u._id,
            name: (u: User) => `${u.firstName} ${u.lastName}`,
          },
        },
      }),
  }
})

vi.mock('../directives/makeDirectives', () => {
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

describe('CORS', () => {
  it('Returns the origin correctly when configured in handler', async () => {
    const handler = createGraphQLHandler({
      loggerConfig: { logger: createLogger({}), options: {} },
      sdls: {},
      directives: {},
      services: {},
      cors: {
        origin: 'https://web.redwoodjs.com',
      },
      onException: () => {},
    })

    const mockedEvent = mockLambdaEvent({
      headers: {
        origin: 'https://redwoodjs.com',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: '{ me { id, name } }' }),
      httpMethod: 'POST',
    })

    const response = await handler(mockedEvent, {} as Context)

    expect(response.statusCode).toBe(200)

    expect(response.headers['access-control-allow-origin']).toEqual(
      'https://web.redwoodjs.com',
    )
  })

  it('Returns requestOrigin if cors origin set to true', async () => {
    const handler = createGraphQLHandler({
      loggerConfig: { logger: createLogger({}), options: {} },
      sdls: {},
      directives: {},
      services: {},
      cors: {
        origin: true,
      },
      onException: () => {},
    })

    const mockedEvent = mockLambdaEvent({
      headers: {
        origin: 'https://someothersite.newjsframework.com',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: '{ me { id, name } }' }),
      httpMethod: 'POST',
    })

    const response = await handler(mockedEvent, {} as Context)

    expect(response.statusCode).toBe(200)

    expect(response.headers['access-control-allow-origin']).toEqual(
      'https://someothersite.newjsframework.com',
    )
  })

  it('Returns the origin for OPTIONS requests', async () => {
    const handler = createGraphQLHandler({
      loggerConfig: { logger: createLogger({}), options: {} },
      sdls: {},
      directives: {},
      services: {},
      cors: {
        origin: 'https://mycrossdomainsite.co.uk',
      },
      onException: () => {},
    })

    const mockedEvent = mockLambdaEvent({
      headers: {
        origin: 'https://someothersite.newjsframework.com',
        'Content-Type': 'application/json',
      },
      httpMethod: 'OPTIONS',
    })

    const response = await handler(mockedEvent, {} as Context)

    expect(response.statusCode).toBe(204)

    expect(response.headers['access-control-allow-origin']).toEqual(
      'https://mycrossdomainsite.co.uk',
    )
  })

  it('Does not return cross origin headers if option not specified', async () => {
    const handler = createGraphQLHandler({
      loggerConfig: { logger: createLogger({}), options: {} },
      sdls: {},
      directives: {},
      services: {},
      onException: () => {},
    })

    const mockedEvent = mockLambdaEvent({
      headers: {
        origin: 'https://someothersite.newjsframework.com',
        'Content-Type': 'application/json',
      },
      httpMethod: 'OPTIONS',
    })

    const response = await handler(mockedEvent, {} as Context)

    expect(response.statusCode).toBe(204)
    const resHeaderKeys = Object.keys(response.headers)

    expect(resHeaderKeys).not.toContain('access-control-allow-origin')
    expect(resHeaderKeys).not.toContain('access-control-allow-credentials')
  })

  it('Returns the requestOrigin when more than one origin supplied in config', async () => {
    const handler = createGraphQLHandler({
      loggerConfig: { logger: createLogger({}), options: {} },
      sdls: {},
      directives: {},
      services: {},
      cors: {
        origin: ['https://site1.one', 'https://site2.two'],
      },
      onException: () => {},
    })

    const mockedEvent: APIGatewayProxyEvent = mockLambdaEvent({
      headers: {
        origin: 'https://site2.two',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: '{ me { id, name } }' }),
      httpMethod: 'POST',
    })

    const response = await handler(mockedEvent, {} as Context)

    expect(response.statusCode).toBe(200)

    // Note: no multiValueHeaders in request, so we expect response to be in headers too
    expect(response.headers['access-control-allow-origin']).toEqual(
      'https://site2.two',
    )
  })

  it('Returns CORS headers with multiValueHeaders in request, as MVH in response', async () => {
    const handler = createGraphQLHandler({
      loggerConfig: { logger: createLogger({}), options: {} },
      sdls: {},
      directives: {},
      services: {},
      cors: {
        origin: ['https://site1.one', 'https://site2.two'],
      },
      onException: () => {},
    })

    const mockedEvent: APIGatewayProxyEvent = mockLambdaEvent({
      headers: {
        origin: 'https://site2.two',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: '{ me { id, name } }' }),
      multiValueHeaders: {
        origin: ['https://site2.two'],
        'Content-Type': ['application/json'],
      },
      httpMethod: 'POST',
    })

    const response = await handler(mockedEvent, {} as Context)

    expect(response.statusCode).toBe(200)

    expect(response.headers['access-control-allow-origin']).toEqual(
      'https://site2.two',
    )
  })
})
