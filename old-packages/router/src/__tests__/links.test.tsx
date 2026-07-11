import React from 'react'

import { act, fireEvent, render, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { back, Route, Router } from '../index.js'
import { Link } from '../link.js'
import { LocationProvider } from '../location.js'
import { NavLink } from '../navLink.js'

function createDummyLocation(pathname: string, search = '') {
  return new URL(pathname + search, 'http://localhost/')
}

describe('<NavLink />', () => {
  it('receives active class on the same pathname', () => {
    const mockLocation = createDummyLocation('/dunder-mifflin')

    const { getByText } = render(
      <LocationProvider location={mockLocation}>
        <NavLink activeClassName="activeTest" to="/dunder-mifflin">
          Dunder Mifflin
        </NavLink>
      </LocationProvider>,
    )

    expect(getByText(/Dunder Mifflin/)).toHaveClass('activeTest')
  })

  it('receives active class on the same pathname with search parameters', () => {
    const mockLocation = createDummyLocation(
      '/search-params',
      '?tab=main&page=1',
    )

    const { getByText } = render(
      <LocationProvider location={mockLocation}>
        <NavLink
          activeClassName="activeTest"
          to={`/search-params?page=1&tab=main`}
        >
          Dunder Mifflin
        </NavLink>
      </LocationProvider>,
    )

    expect(getByText(/Dunder Mifflin/)).toHaveClass('activeTest')
  })

  it('receives active class on the pathname when we are on a sub page', () => {
    const mockLocation = createDummyLocation('/users/1')

    const { getByText } = render(
      <LocationProvider location={mockLocation}>
        <NavLink activeClassName="activeTest" matchSubPaths to="/users">
          Dunder Mifflin
        </NavLink>
      </LocationProvider>,
    )

    expect(getByText(/Dunder Mifflin/)).toHaveClass('activeTest')
  })

  it('receives active class on the pathname when we are on the exact page, but also matching child paths', () => {
    const mockLocation = createDummyLocation('/users/1')

    const { getByText } = render(
      <LocationProvider location={mockLocation}>
        <NavLink activeClassName="activeTest" matchSubPaths to="/users/1">
          Dunder Mifflin
        </NavLink>
      </LocationProvider>,
    )

    expect(getByText(/Dunder Mifflin/)).toHaveClass('activeTest')
  })

  it('receives active class on the same pathname only', () => {
    const mockLocation = createDummyLocation('/pathname', '?tab=main&page=1')

    const { getByText } = render(
      <LocationProvider location={mockLocation}>
        <NavLink
          activeClassName="activeTest"
          to="/pathname?tab=second&page=2"
          activeMatchParams={[]}
        >
          Dunder Mifflin
        </NavLink>
      </LocationProvider>,
    )

    expect(getByText(/Dunder Mifflin/)).toHaveClass('activeTest')
  })

  it('receives active class on the same pathname with a matched param key', () => {
    const mockLocation = createDummyLocation(
      '/pathname-params',
      '?tab=main&page=1',
    )

    const { getByText } = render(
      <LocationProvider location={mockLocation}>
        <NavLink
          activeClassName="activeTest"
          to={`/pathname-params?tab=main&page=2`}
          // @ts-expect-error TODO: Fix our types
          activeMatchParams={['tab']}
        >
          Dunder Mifflin
        </NavLink>
      </LocationProvider>,
    )

    expect(getByText(/Dunder Mifflin/)).toHaveClass('activeTest')
  })

  it('receives active class on the same pathname with a matched key-value param', () => {
    const mockLocation = createDummyLocation(
      '/search-params',
      '?tab=main&page=1',
    )

    const { getByText } = render(
      <LocationProvider location={mockLocation}>
        <NavLink
          activeClassName="activeTest"
          to={`/search-params?page=1&tab=main`}
          activeMatchParams={[{ page: 1 }]}
        >
          Dunder Mifflin
        </NavLink>
      </LocationProvider>,
    )

    expect(getByText(/Dunder Mifflin/)).toHaveClass('activeTest')
  })

  it('receives active class on the same pathname with a matched param key and a matched key-value param', () => {
    const mockLocation = createDummyLocation(
      '/search-params',
      '?tab=main&page=1&category=book',
    )

    const { getByText } = render(
      <LocationProvider location={mockLocation}>
        <NavLink
          activeClassName="activeTest"
          to={`/search-params?page=3&tab=main&category=book`}
          // @ts-expect-error TODO: Fix our types
          activeMatchParams={[{ category: 'book' }, 'page']}
        >
          Dunder Mifflin
        </NavLink>
      </LocationProvider>,
    )

    expect(getByText(/Dunder Mifflin/)).toHaveClass('activeTest')
  })

  it('receives active class on the same pathname with a matched param key and multiple matched key-value param', () => {
    const mockLocation = createDummyLocation(
      '/search-params',
      '?tab=about&page=3&category=magazine',
    )

    const { getByText } = render(
      <LocationProvider location={mockLocation}>
        <NavLink
          activeClassName="activeTest"
          to={`/search-params?page=3&tab=main&category=magazine`}
          // @ts-expect-error TODO: Fix our types
          activeMatchParams={[{ page: 3, category: 'magazine' }, 'tab']}
        >
          Dunder Mifflin
        </NavLink>
      </LocationProvider>,
    )

    expect(getByText(/Dunder Mifflin/)).toHaveClass('activeTest')
  })

  it('receives active class on the same pathname with a matched param key and multiple matched key-value param in separated', () => {
    const mockLocation = createDummyLocation(
      '/search-params',
      '?tab=about&page=3&category=magazine',
    )

    const { getByText } = render(
      <LocationProvider location={mockLocation}>
        <NavLink
          activeClassName="activeTest"
          to={`/search-params?page=3&tab=main&category=magazine`}
          // @ts-expect-error TODO: Fix our types
          activeMatchParams={[{ page: 3 }, { category: 'magazine' }, 'tab']}
        >
          Dunder Mifflin
        </NavLink>
      </LocationProvider>,
    )

    expect(getByText(/Dunder Mifflin/)).toHaveClass('activeTest')
  })

  it('does NOT receive active class on a different path that starts with the same word', () => {
    const mockLocation = createDummyLocation('/users-settings')

    const { getByText } = render(
      <LocationProvider location={mockLocation}>
        <NavLink activeClassName="activeTest" matchSubPaths to="/users">
          Dunder Mifflin
        </NavLink>
      </LocationProvider>,
    )

    expect(getByText(/Dunder Mifflin/)).not.toHaveClass('activeTest')
  })

  it('does NOT receive active class on different path', () => {
    const mockLocation = createDummyLocation('/staples')

    const { getByText } = render(
      <LocationProvider location={mockLocation}>
        <NavLink activeClassName="activeTest" to="/dunder-mifflin">
          Dunder Mifflin
        </NavLink>
      </LocationProvider>,
    )

    expect(getByText(/Dunder Mifflin/)).not.toHaveClass('activeTest')
  })

  it('does NOT receive active class on the same pathname with different search params', () => {
    const mockLocation = createDummyLocation(
      '/search-params',
      '?tab=main&page=1',
    )

    const { getByText } = render(
      <LocationProvider location={mockLocation}>
        <NavLink
          activeClassName="activeTest"
          to={`/search-params?page=2&tab=main`}
        >
          Dunder Mifflin
        </NavLink>
      </LocationProvider>,
    )

    expect(getByText(/Dunder Mifflin/)).not.toHaveClass('activeTest')
  })

  it('does NOT receive active class on the same pathname with a different search param key', () => {
    const mockLocation = createDummyLocation(
      '/pathname-params',
      '?category=car&page=1',
    )

    const { getByText } = render(
      <LocationProvider location={mockLocation}>
        <NavLink
          activeClassName="activeTest"
          to={`/pathname-params?tab=main&page=2`}
          // @ts-expect-error TODO: Fix our types
          activeMatchParams={['tab']}
        >
          Dunder Mifflin
        </NavLink>
      </LocationProvider>,
    )

    expect(getByText(/Dunder Mifflin/)).not.toHaveClass('activeTest')
  })
})

describe('<Link />', () => {
  describe('options', () => {
    it('should let us replace history when clicking on a link', async () => {
      const HomePage = () => (
        <>
          <h1>Home Page</h1>
          <Link to="/about">About-link</Link>
        </>
      )
      const AboutPage = () => (
        <>
          <h1>About Page</h1>
          <Link to="/contact" options={{ replace: true }}>
            Contact-link
          </Link>
        </>
      )
      const ContactPage = () => <h1>Contact Page</h1>

      const TestRouter = () => (
        <Router>
          <Route path="/" page={HomePage} name="home" />
          <Route path="/about" page={AboutPage} name="about" />
          <Route path="/contact" page={ContactPage} name="about" />
        </Router>
      )

      const screen = render(<TestRouter />)

      // starts on home page
      await waitFor(() => screen.getByText('Home Page'))

      fireEvent.click(screen.getByText('About-link'))
      await waitFor(() => screen.getByText('About Page'))

      fireEvent.click(screen.getByText('Contact-link'))
      await waitFor(() => screen.getByText('Contact Page'))

      // Going back here skips the About page because the link on the About
      // page had the replace option
      act(() => back())
      await waitFor(() => screen.getByText('Home Page'))
    })
  })
})
