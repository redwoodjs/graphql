import { describe, test, expect } from 'vitest'

import { parseBody, mergeMultiValueHeaders } from '../../requestHandlers/utils'

describe('Tests AWS Lambda to Fastify utility functions', () => {
  describe('Tests parseBody', () => {
    test('with a string', () => {
      const parsed = parseBody('foo')
      expect(parsed).toEqual({ body: 'foo', isBase64Encoded: false })
    })

    test('with a buffer', () => {
      const buf = Buffer.from('foo', 'base64')
      const parsed = parseBody(buf)
      expect(parsed).toEqual({ body: 'foo=', isBase64Encoded: true })
    })
  })

  describe('Tests mergeMultiValueHeaders', () => {
    test('with same header', () => {
      const headers = { 'content-type': 'application/json' }
      const multiValueHeaders = {
        'content-type': ['application/json', 'text/html'],
      }
      const merged = mergeMultiValueHeaders(headers, multiValueHeaders)
      expect(merged).toEqual({
        'content-type': ['application/json; text/html'],
      })
    })

    test('with multi-value header that is title-cased', () => {
      const headers = { 'content-type': 'application/json' }
      const multiValueHeaders = {
        'Content-Type': ['application/json', 'text/html'],
      }
      const merged = mergeMultiValueHeaders(headers, multiValueHeaders)
      expect(merged).toEqual({
        'content-type': ['application/json; text/html'],
      })
    })

    test('when no headers, but has multi-value headers', () => {
      const headers = {}
      const multiValueHeaders = {
        'content-type': ['application/json', 'text/html'],
      }
      const merged = mergeMultiValueHeaders(headers, multiValueHeaders)
      expect(merged).toEqual({
        'content-type': ['application/json; text/html'],
      })
    })

    test('set-cookie', () => {
      const headers = {}
      const multiValueHeaders = {
        'Set-Cookie': ['rob=TS4Life', 'danny=kittens'],
      }
      const merged = mergeMultiValueHeaders(headers, multiValueHeaders)
      expect(merged).toEqual({
        'set-cookie': ['rob=TS4Life', 'danny=kittens'],
      })
    })

    test('set-cookie in both headers and multiValueHeaders', () => {
      const headers = { 'set-cookie': 'peter=snaplet' }
      const multiValueHeaders = {
        'set-cookie': ['peter=snaplet', 'tom=hammer'],
      }
      const merged = mergeMultiValueHeaders(headers, multiValueHeaders)
      expect(merged).toEqual({
        'set-cookie': ['peter=snaplet', 'tom=hammer'],
      })
    })
  })
})
