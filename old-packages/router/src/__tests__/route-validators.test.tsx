import React from 'react'

import { describe, it, expect } from 'vitest'

import { isValidRoute } from '../route-validators.js'
import { Route } from '../Route.js'

describe('isValidRoute', () => {
  it('throws if Route does not have a path', () => {
    // @ts-expect-error Its ok mate, we're checking the validator
    const RouteCheck = <Route name="noPath" page={() => <h1>Hello</h1>} />

    expect(() => isValidRoute(RouteCheck)).toThrowError(
      'Route element for "noPath" is missing required props: path',
    )
  })

  it('throws if a standard Route does not have a name', () => {
    // @ts-expect-error Its ok mate, we're checking the validator
    const RouteCheck = <Route path="/hello" page={() => <h1>Hello</h1>} />

    expect(() => isValidRoute(RouteCheck)).toThrowError(
      'Route element for "/hello" is missing required props: name',
    )
  })

  it('throws if Route does not have a page or path', () => {
    // @ts-expect-error Its ok mate, we're checking the validator
    const RouteCheck = <Route name="noPage" />

    expect(() => isValidRoute(RouteCheck)).toThrowError(
      'Route element for "noPage" is missing required props: path, page',
    )
  })

  it('throws if redirect Route does have have a path', () => {
    // @ts-expect-error Its ok mate, we're checking the validator
    const RouteToCheck = <Route redirect="/dash" />

    expect(() => isValidRoute(RouteToCheck)).toThrowError(
      'Route element is missing required props: path',
    )
  })

  it("throws if NotFoundPage doesn't have page prop", () => {
    // @ts-expect-error Its ok mate, we're checking the validator
    const RouteToCheck = <Route notfound name="bazinga" />

    expect(() => isValidRoute(RouteToCheck)).toThrowError(
      'Route element for "bazinga" is missing required props: page',
    )
  })

  it("does not throw if NotFoundPage doesn't have a path", () => {
    // @ts-expect-error Its ok mate, we're checking the validator
    const RouteToCheck = <Route name="bazinga" notfound page={() => <></>} />

    expect(() => isValidRoute(RouteToCheck)).not.toThrow()
  })
})
