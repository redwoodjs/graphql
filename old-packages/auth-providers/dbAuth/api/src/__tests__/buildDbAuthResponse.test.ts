import type { APIGatewayProxyEvent } from 'aws-lambda'
import { describe, it, expect } from 'vitest'

import { getDbAuthResponseBuilder } from '../shared'

describe('buildDbAuthResponse', () => {
  it('should add cors headers and set-cookie as array to the response to Requests', () => {
    const resHeaders = new Headers({
      header1: 'value1',
      header2: 'value2',
    })

    resHeaders.append('set-cookie', 'cookie1=value1')
    resHeaders.append('set-cookie', 'cookie2=value2')

    const response = {
      statusCode: 200,
      headers: resHeaders,
    }

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
    }

    const expectedResponse = {
      statusCode: 200,
      headers: {
        header1: 'value1',
        header2: 'value2',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
        'set-cookie': ['cookie1=value1', 'cookie2=value2'],
      },
    }

    const createResponse = getDbAuthResponseBuilder({} as Request)
    const result = createResponse(response, corsHeaders)

    expect(result).toEqual(expectedResponse)
  })

  it('should add cors headers and set-cookie as multiValueHeaders array to the response to APIGatewayProxyEvent', () => {
    const resHeaders = new Headers({
      header1: 'value1',
      header2: 'value2',
    })

    resHeaders.append('set-cookie', 'cookie1=value1')
    resHeaders.append('set-cookie', 'cookie2=value2')

    const response = {
      statusCode: 200,
      headers: resHeaders,
    }

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
    }

    const expectedResponse = {
      statusCode: 200,
      headers: {
        header1: 'value1',
        header2: 'value2',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
      },
      multiValueHeaders: {
        'Set-Cookie': ['cookie1=value1', 'cookie2=value2'],
      },
    }

    const createResponse = getDbAuthResponseBuilder({
      multiValueHeaders: {},
    } as unknown as APIGatewayProxyEvent)
    const result = createResponse(response, corsHeaders)

    expect(result).toEqual(expectedResponse)
  })

  it('should handle empty set-cookie headers', () => {
    const response = {
      statusCode: 200,
      headers: new Headers({
        header1: 'value1',
        header2: 'value2',
      }),
    }

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST',
    }

    const expectedResponse = {
      statusCode: 200,
      headers: {
        header1: 'value1',
        header2: 'value2',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST',
      },
    }

    const createResponse = getDbAuthResponseBuilder({} as Request)
    const result = createResponse(response, corsHeaders)

    expect(result).toEqual(expectedResponse)
  })
})
