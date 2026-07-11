import { afterEach, beforeEach, describe, expect, it, vi, vitest } from 'vitest'

import type { Middleware, MiddlewareClass } from '@redwoodjs/web/middleware'
import {
  MiddlewareRequest,
  MiddlewareResponse,
} from '@redwoodjs/web/middleware'

import {
  addMiddlewareHandlers,
  chain,
  groupByRoutePatterns,
} from './register.js'
import type { MiddlewareReg } from './types.js'

const fakeMiddleware: Middleware = vitest.fn()

class FakeClassMw implements MiddlewareClass {
  value: number

  constructor(value: number) {
    this.value = value
  }

  invoke(_req: MiddlewareRequest, res: MiddlewareResponse) {
    res.body = 'MW initialized with ' + this.value
    res.headers.set('class-mw-value', this.value.toString())
    return res
  }
}

describe('groupByRoutePatterns', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.mocked(console).error.mockRestore()
  })

  it('should group middleware by default *', () => {
    const simpleExample = [fakeMiddleware]

    const output = groupByRoutePatterns(simpleExample)

    expect(output['*']).toStrictEqual([fakeMiddleware])
  })

  it('should handle when mixed types are provided', () => {
    const mixedTypes: MiddlewareReg = [
      fakeMiddleware,
      [fakeMiddleware, '/*.{extension}'],
    ]

    const output = groupByRoutePatterns(mixedTypes)

    expect(output['*']).toStrictEqual([fakeMiddleware])
    expect(output['/*.{extension}']).toStrictEqual([fakeMiddleware])
  })

  it('Should multiple middleware for the same pattern', () => {
    const multiple: MiddlewareReg = [
      fakeMiddleware,
      [fakeMiddleware, '/*.png'],
      [fakeMiddleware, '/*.png'],
      [fakeMiddleware, '/*.png'],
      fakeMiddleware,
    ]

    const output = groupByRoutePatterns(multiple)

    expect(output['*'].length).toBe(2)
    expect(output['/*.png'].length).toBe(3)
  })

  it('Throws if not a function, instance or tuple', () => {
    const badInput: MiddlewareReg = ['/bad-input'] as any

    expect(() => groupByRoutePatterns(badInput)).toThrow()
  })

  it('Handles class based middleware', async () => {
    const classBased: MiddlewareReg = [
      new FakeClassMw(1),
      [new FakeClassMw(2), '/second-path'],
    ]

    const output = groupByRoutePatterns(classBased)

    const exampleRequest = new MiddlewareRequest(
      new Request('https://example.com'),
    )

    const firstOutput = await output['*'][0]?.(
      exampleRequest,
      new MiddlewareResponse(),
    )
    expect(firstOutput?.body).toBe('MW initialized with 1')

    const secondOutput = await output['/second-path'][0]?.(
      exampleRequest,
      new MiddlewareResponse(),
    )
    expect((secondOutput || {})?.body).toBe('MW initialized with 2')
  })
})

describe('chain', () => {
  const addHeaderMw: Middleware = (_req, res) => {
    res.headers.append('add-header-mw', 'added')
    return res
  }

  const addCookieMw: Middleware = (_req, res) => {
    res.cookies.set('add-cookie-mw', 'added')
    return res
  }

  const registerList: MiddlewareReg = [
    // Note the order here, fake middleware first, which sets body and headers
    new FakeClassMw(5),
    [addHeaderMw, '*'],
    [addCookieMw, '/bazinga'],
    [new FakeClassMw(999), '/bazinga'],
  ]

  const exampleRequest = new MiddlewareRequest(
    new Request('https://example.com/bazinga'),
  )

  it('should chain middleware together', async () => {
    const grouped = groupByRoutePatterns(registerList)

    const allRoutes = chain(grouped['*'])

    const output = await allRoutes(exampleRequest, new MiddlewareResponse())

    expect(output.body).toBe('MW initialized with 5')
    expect(output.headers.get('class-mw-value')).toBe('5')
    expect(output.headers.get('add-header-mw')).toBe('added')
  })

  it('Routing with find-my-way', async () => {
    const mwRouter = addMiddlewareHandlers(registerList)
    const match = mwRouter.find('GET', '/bazinga')

    // No way of customizing find-my-way route type
    const output = await match?.handler(
      exampleRequest,
      new MiddlewareResponse(),
    )

    // The more specific one gets used
    expect(output.body).toBe('MW initialized with 999')
    expect(output.headers.get('class-mw-value')).toBe('999')

    // The other one still gets chained
    expect(output.cookies.get('add-cookie-mw')).toBe('added')

    // Because /bazinga is more specific, the '*' handlers won't be executed
    expect(output.headers.get('add-header-mw')).toBeFalsy()
  })
})
