import type { Handler } from 'aws-lambda'
import type { FastifyRequest, FastifyReply } from 'fastify'
import { vi, describe, beforeEach, test, expect, afterEach } from 'vitest'

import { requestHandler } from '../../requestHandlers/awsLambdaFastify'

describe('Tests AWS Lambda to Fastify request transformation and handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const request = {
    method: 'GET',
    body: '',
    headers: '',
    query: '/',
    params: {},
    url: '/',
    urlData: () => ({ path: '/' }),
    log: console as unknown,
  } as unknown as FastifyRequest

  const mockedReply = {
    status: (code: number) => {
      return { code, send: vi.fn() }
    },
    headers: () => vi.fn(),
    header: () => vi.fn(),
    send: () => vi.fn(),
    log: console as unknown,
  } as unknown as FastifyReply

  test('requestHandler replies with simple body', async () => {
    vi.spyOn(mockedReply, 'send')
    vi.spyOn(mockedReply, 'status')

    const handler: Handler = async () => {
      return new Promise((resolve) => {
        resolve({
          body: { foo: 'bar' },
        })
      })
    }

    await requestHandler(request, mockedReply, handler)

    expect(mockedReply.send).toHaveBeenCalledWith({ foo: 'bar' })
    expect(mockedReply.status).toHaveBeenCalledWith(200)
  })

  test('requestHandler replies with a base64Encoded body', async () => {
    vi.spyOn(mockedReply, 'send')
    vi.spyOn(mockedReply, 'status')

    const handler: Handler = async () => {
      return new Promise((resolve) => {
        resolve({
          body: 'this_is_a_test_of_base64Encoding',
          isBase64Encoded: true,
        })
      })
    }

    await requestHandler(request, mockedReply, handler)

    expect(mockedReply.send).toHaveBeenCalledWith(
      Buffer.from('this_is_a_test_of_base64Encoding', 'base64'),
    )
    expect(mockedReply.status).toHaveBeenCalledWith(200)
  })

  describe('error handling', () => {
    let consoleError: typeof console.error

    beforeEach(() => {
      consoleError = console.error
      console.error = () => {}
    })

    afterEach(() => {
      console.error = consoleError
    })

    test('requestHandler returns an error status if handler throws an error', async () => {
      vi.spyOn(mockedReply, 'status')

      const handler = async () => {
        return new Promise((_resolve, reject) => {
          reject(new Error('error'))
        })
      }

      await requestHandler(request, mockedReply, handler)

      expect(mockedReply.status).toHaveBeenCalledWith(500)
    })
  })

  test('requestHandler replies with headers', async () => {
    const headersRequest = {
      method: 'GET',
      body: '',
      headers: {},
      query: '/',
      params: {},
      url: '/',
      urlData: () => ({ path: '/' }),
      log: console as unknown,
    } as unknown as FastifyRequest

    vi.spyOn(mockedReply, 'headers')
    vi.spyOn(mockedReply, 'header')

    const handler: Handler = async () => {
      return new Promise((resolve) => {
        resolve({
          body: { foo: 'bar' },
          headers: {
            'content-type': 'application/json',
            authorization: 'Bearer token 123',
          },
        })
      })
    }

    await requestHandler(headersRequest, mockedReply, handler)

    expect(mockedReply.headers).not.toHaveBeenCalled()
    expect(mockedReply.header).toHaveBeenCalledWith(
      'content-type',
      'application/json',
    )
    expect(mockedReply.header).toHaveBeenCalledWith(
      'authorization',
      'Bearer token 123',
    )
  })

  test('requestHandler replies with multi-value headers', async () => {
    const headersRequest = {
      method: 'GET',
      body: '',
      headers: {},
      query: '/',
      params: {},
      url: '/',
      urlData: () => ({ path: '/' }),
      log: console as unknown,
    } as unknown as FastifyRequest

    vi.spyOn(mockedReply, 'headers')
    vi.spyOn(mockedReply, 'header')

    const handler: Handler = async () => {
      return new Promise((resolve) => {
        resolve({
          body: {},
          headers: {},
          multiValueHeaders: {
            'content-type': ['application/json', 'text/html'],
          },
        })
      })
    }

    await requestHandler(headersRequest, mockedReply, handler)

    expect(mockedReply.headers).not.toHaveBeenCalled()
    expect(mockedReply.header).toHaveBeenCalledWith(
      'content-type',
      'application/json; text/html',
    )
  })
})
