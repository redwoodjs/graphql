import { describe, expect, it } from 'vitest'

import { mapRwCorsOptionsToYoga } from '../cors'

/** Yoga CORS Options looks like
 *
 * export interface CORSOptions {
    origin?: string[];
    methods?: string[];
    allowedHeaders?: string[];
    exposedHeaders?: string[];
    credentials?: boolean;
    maxAge?: number;
}
 *
 */
describe('mapRwCorsOptionsToYoga', () => {
  it('Handles single endpoint, headers and method', () => {
    const output = mapRwCorsOptionsToYoga({
      origin: 'http://localhost:8910',
      allowedHeaders: 'X-Bazinga',
      methods: 'PATCH',
      credentials: true,
    })

    expect(output).toEqual({
      credentials: true,
      allowedHeaders: ['X-Bazinga'],
      methods: ['PATCH'],
      origin: ['http://localhost:8910'],
    })
  })

  it('Handles options as an array', () => {
    const output = mapRwCorsOptionsToYoga({
      origin: ['http://localhost:8910'],
      credentials: false,
      allowedHeaders: ['X-Bazinga', 'X-Kittens', 'Authorization'],
      methods: ['PATCH', 'PUT', 'POST'],
    })

    expect(output).toEqual({
      origin: ['http://localhost:8910'],
      methods: ['PATCH', 'PUT', 'POST'],
      allowedHeaders: ['X-Bazinga', 'X-Kittens', 'Authorization'],
    })
  })

  it('Handles multiple endpoints', () => {
    const output = mapRwCorsOptionsToYoga({
      origin: ['https://bazinga.com', 'https://softkitty.mew'],
      credentials: true,
      allowedHeaders: ['X-Bazinga', 'X-Kittens', 'Authorization'],
      methods: ['PATCH', 'PUT', 'POST'],
    })

    expect(output).toEqual({
      credentials: true,
      origin: ['https://bazinga.com', 'https://softkitty.mew'],
      methods: ['PATCH', 'PUT', 'POST'],
      allowedHeaders: ['X-Bazinga', 'X-Kittens', 'Authorization'],
    })
  })

  it('Returns the request origin, if cors origin is set to true', () => {
    const output = mapRwCorsOptionsToYoga(
      {
        origin: true,
        credentials: true,
        allowedHeaders: ['Auth-Provider', 'X-Kittens', 'Authorization'],
        methods: ['DELETE'],
      },
      'https://myapiside.redwood.com', // <-- this is the Request.headers.origin
    )

    expect(output).toEqual({
      credentials: true,
      origin: ['https://myapiside.redwood.com'],
      methods: ['DELETE'],
      allowedHeaders: ['Auth-Provider', 'X-Kittens', 'Authorization'],
    })
  })

  it('Returns the *, if cors origin is set to true AND no request origin supplied', () => {
    const output = mapRwCorsOptionsToYoga(
      {
        origin: true,
        credentials: true,
        allowedHeaders: ['Auth-Provider', 'X-Kittens', 'Authorization'],
        methods: ['DELETE'],
      },
      undefined,
    )

    expect(output).toEqual({
      credentials: true,
      origin: ['*'],
      methods: ['DELETE'],
      allowedHeaders: ['Auth-Provider', 'X-Kittens', 'Authorization'],
    })
  })
})
