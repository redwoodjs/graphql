import React from 'react'

import { render, waitFor } from '@testing-library/react'
import { test, beforeEach, expect } from 'vitest'

import { getFocus } from '../a11yUtils.js'
import { namedRoutes as routes } from '../namedRoutes.js'
import RouteFocus from '../route-focus.js'
import { Route } from '../Route.js'
import { Router } from '../router.js'

// SETUP
const RouteFocusPage = () => (
  <>
    <RouteFocus>
      <a>a link is a focusable element</a>
    </RouteFocus>
    <h1>Route Focus Page</h1>
    <p></p>
  </>
)

const NoRouteFocusPage = () => <h1>No Route Focus Page</h1>

const RouteFocusNoChildren = () => (
  <>
    {/* @ts-expect-error - Testing a JS scenario */}
    <RouteFocus></RouteFocus>
    <h1>Route Focus No Children Page</h1>
    <p></p>
  </>
)

const RouteFocusTextNodePage = () => (
  <>
    <RouteFocus>some text</RouteFocus>
    <h1>Route Focus Text Node Page </h1>
    <p></p>
  </>
)

const RouteFocusNegativeTabIndexPage = () => (
  <>
    <RouteFocus>
      <p>my tabindex is -1</p>
    </RouteFocus>
    <h1>Route Focus Negative Tab Index Page </h1>
    <p></p>
  </>
)

beforeEach(() => {
  window.history.pushState({}, '', '/')
  Object.keys(routes).forEach((key) => delete routes[key])
})

test('getFocus returns a focusable element if RouteFocus has one', async () => {
  const TestRouter = () => (
    <Router>
      <Route path="/" page={RouteFocusPage} name="routeFocus" />
    </Router>
  )

  const screen = render(<TestRouter />)

  await waitFor(() => {
    screen.getByText(/Route Focus Page/i)
    const routeFocus = getFocus()
    expect(routeFocus).toHaveTextContent('a link is a focusable element')
  })
})

test("getFocus returns null if there's no RouteFocus", async () => {
  const TestRouter = () => (
    <Router>
      <Route path="/" page={NoRouteFocusPage} name="noRouteFocus" />
    </Router>
  )

  const screen = render(<TestRouter />)

  await waitFor(() => {
    screen.getByText(/No Route Focus Page/i)
    const routeFocus = getFocus()
    expect(routeFocus).toBeNull()
  })
})

test("getFocus returns null if RouteFocus doesn't have any children", async () => {
  const TestRouter = () => (
    <Router>
      <Route path="/" page={RouteFocusNoChildren} name="routeFocusNoChildren" />
    </Router>
  )

  const screen = render(<TestRouter />)

  await waitFor(() => {
    screen.getByText(/Route Focus No Children Page/i)
    const routeFocus = getFocus()
    expect(routeFocus).toBeNull()
  })
})

test('getFocus returns null if RouteFocus has just a Text node', async () => {
  const TestRouter = () => (
    <Router>
      <Route path="/" page={RouteFocusTextNodePage} name="routeFocusTextNode" />
    </Router>
  )

  const screen = render(<TestRouter />)

  await waitFor(() => {
    screen.getByText(/Route Focus Text Node Page/i)
    const routeFocus = getFocus()
    expect(routeFocus).toBeNull()
  })
})

test("getFocus returns null if RouteFocus's child isn't focusable", async () => {
  const TestRouter = () => (
    <Router>
      <Route
        path="/"
        page={RouteFocusNegativeTabIndexPage}
        name="routeFocusNegativeTabIndex"
      />
    </Router>
  )

  const screen = render(<TestRouter />)

  await waitFor(() => {
    screen.getByText(/Route Focus Negative Tab Index Page/i)
    const routeFocus = getFocus()
    expect(routeFocus).toBeNull()
  })
})
