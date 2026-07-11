import type { Request as ExpressRequest } from 'express'
import { describe, it, expect } from 'vitest'

import { getFullUrl } from '../utils.js'

function mockExpressRequest(url: string) {
  const req = {
    originalUrl: url,
    protocol: 'http',
    headers: { host: 'localhost:8910' },
    get: (header: 'host') => req.headers[header],
    // Type casting here because a proper Request object has about 100 fields
    // and I don't want to list them all here just for a test
  } as ExpressRequest

  return req
}

describe('getFullUrl', () => {
  describe('rsc enabled', () => {
    const rscEnabled = true

    it("returns the original URL if the request's searchParams don't include rsc request props", () => {
      const req = mockExpressRequest('/foo/bar?extra=baz')

      const result = getFullUrl(req, rscEnabled)

      expect(result).toBe('http://localhost:8910/foo/bar?extra=baz')
    })

    it("reads pathname and search parameters from the request's searchParams if they're available", () => {
      const req = mockExpressRequest(
        '/rw-rsc/__rwjs__Routes?__rwjs__pathname=' +
          encodeURIComponent('/cux/cuux') +
          '&__rwjs__search=' +
          encodeURIComponent('extra=corge'),
      )

      const result = getFullUrl(req, rscEnabled)

      expect(result).toBe('http://localhost:8910/cux/cuux?extra=corge')
    })
  })
})
