import React from 'react'

import { act, cleanup, render, screen } from '@testing-library/react'
import { describe, beforeEach, afterEach, it, expect } from 'vitest'
import type { Mock } from 'vitest'

import { navigate } from '../history.js'
import { namedRoutes as routes } from '../namedRoutes.js'
import { Route } from '../Route.js'
import { Router } from '../router.js'

describe('Router scroll reset', () => {
  const Page1 = () => <div>Page 1</div>
  const Page2 = () => <div>Page 2</div>
  const TestRouter = () => (
    <Router>
      <Route path="/" page={Page1} name="page1" />
      <Route path="/two" page={Page2} name="page2" />
    </Router>
  )

  beforeEach(async () => {
    ;(globalThis.scrollTo as Mock).mockClear()
    render(<TestRouter />)

    // Make sure we're starting on the home route
    screen.getByText('Page 1')
  })

  afterEach(async () => {
    // @NOTE: for some reason, the Router state does not reset between renders
    act(() => navigate('/'))
    cleanup()
  })

  it('resets on location/path change', async () => {
    act(() =>
      navigate(
        // @ts-expect-error - AvailableRoutes built in project only
        routes.page2(),
      ),
    )

    screen.getByText('Page 2')

    expect(globalThis.scrollTo).toHaveBeenCalledTimes(1)
  })

  it('resets on location/path and queryChange change', async () => {
    act(() =>
      navigate(
        // @ts-expect-error - AvailableRoutes built in project only
        routes.page2({
          tab: 'three',
        }),
      ),
    )

    screen.getByText('Page 2')

    expect(globalThis.scrollTo).toHaveBeenCalledTimes(1)
  })

  it('resets scroll on query params (search) change on the same page', async () => {
    act(() =>
      // We're staying on page 1, but changing the query params
      navigate(
        // @ts-expect-error - AvailableRoutes built in project only
        routes.page1({
          queryParam1: 'foo',
        }),
      ),
    )

    screen.getByText('Page 1')

    expect(globalThis.scrollTo).toHaveBeenCalledTimes(1)
  })

  it('does NOT reset on hash change', async () => {
    screen.getByText('Page 1')

    act(() =>
      // Stay on page 1, but change the hash
      navigate(`#route=66`, { replace: true }),
    )

    screen.getByText('Page 1')

    expect(globalThis.scrollTo).not.toHaveBeenCalled()
  })

  it('when scroll option is false, does NOT reset on location/path change', async () => {
    act(() =>
      navigate(
        // @ts-expect-error - AvailableRoutes built in project only
        routes.page2(),
        {
          scroll: false,
        },
      ),
    )

    screen.getByText('Page 2')

    expect(globalThis.scrollTo).toHaveBeenCalledTimes(0)
  })

  it('when scroll option is false, does NOT reset on location/path and queryChange change', async () => {
    act(() =>
      navigate(
        // @ts-expect-error - AvailableRoutes built in project only
        routes.page2({
          tab: 'three',
        }),
        {
          scroll: false,
        },
      ),
    )

    screen.getByText('Page 2')

    expect(globalThis.scrollTo).toHaveBeenCalledTimes(0)
  })

  it('when scroll option is false, does NOT reset scroll on query params (search) change on the same page', async () => {
    act(() =>
      // We're staying on page 1, but changing the query params
      navigate(
        // @ts-expect-error - AvailableRoutes built in project only
        routes.page1({
          queryParam1: 'foo',
        }),
        {
          scroll: false,
        },
      ),
    )

    screen.getByText('Page 1')

    expect(globalThis.scrollTo).toHaveBeenCalledTimes(0)
  })
})
