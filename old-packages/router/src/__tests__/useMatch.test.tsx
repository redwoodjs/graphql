import React from 'react'

import { render, renderHook as tlrRenderHook } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'

import { Link } from '../link.js'
import { LocationProvider } from '../location.js'
import { useMatch } from '../useMatch.js'
import { flattenSearchParams } from '../util.js'

function createDummyLocation(pathname: string, search = '') {
  return new URL(pathname + search, 'http://localhost/')
}

describe('useMatch', () => {
  const MyLink = ({
    to,
    ...rest
  }: React.ComponentPropsWithoutRef<typeof Link>) => {
    const [pathname, queryString] = to.split('?')
    const matchInfo = useMatch(pathname, {
      searchParams: flattenSearchParams(queryString),
    })

    return (
      <Link
        to={to}
        style={{ color: matchInfo.match ? '#0F0' : '#F00' }}
        {...rest}
      />
    )
  }

  it('returns a match on the same pathname', () => {
    const mockLocation = createDummyLocation('/dunder-mifflin')

    const { getByText } = render(
      <LocationProvider location={mockLocation}>
        <MyLink to="/dunder-mifflin">Dunder Mifflin</MyLink>
      </LocationProvider>,
    )

    expect(getByText(/Dunder Mifflin/)).toHaveStyle('color: #0F0')
  })

  it('returns a match on the same pathname with search parameters', () => {
    const mockLocation = createDummyLocation(
      '/search-params',
      '?page=1&tab=main',
    )

    const { getByText } = render(
      <LocationProvider location={mockLocation}>
        <MyLink to={`/search-params?tab=main&page=1`}>Dunder Mifflin</MyLink>
      </LocationProvider>,
    )

    expect(getByText(/Dunder Mifflin/)).toHaveStyle('color: #0F0')
  })

  it('does NOT receive active class on different path', () => {
    const mockLocation = createDummyLocation('/staples')

    const { getByText } = render(
      <LocationProvider location={mockLocation}>
        <MyLink to="/dunder-mifflin">Dunder Mifflin</MyLink>
      </LocationProvider>,
    )

    expect(getByText(/Dunder Mifflin/)).toHaveStyle('color: #F00')
  })

  it('does NOT receive active class on the same pathname with different parameters', () => {
    const mockLocation = createDummyLocation(
      '/search-params',
      '?tab=main&page=1',
    )

    const { getByText } = render(
      <LocationProvider location={mockLocation}>
        <MyLink to={`/search-params?page=2&tab=main`}>Dunder Mifflin</MyLink>
      </LocationProvider>,
    )

    expect(getByText(/Dunder Mifflin/)).toHaveStyle('color: #F00')
  })

  describe('routeParams', () => {
    const mockLocation = createDummyLocation('/dummy-location')

    type CallbackType = () => ReturnType<typeof useMatch>
    function renderHook(cb: CallbackType) {
      return tlrRenderHook(cb, {
        wrapper: ({ children }) => (
          <LocationProvider location={mockLocation}>
            {children}
          </LocationProvider>
        ),
      })
    }

    function setLocation(pathname: string, search = '') {
      mockLocation.pathname = pathname
      mockLocation.search = search
    }

    afterEach(() => {
      setLocation('/dummy-location')
    })

    it('matches a path with literal route param', () => {
      setLocation('/test-path/foobar')

      const { result } = renderHook(() => useMatch('/test-path/{param}'))

      expect(result.current.match).toBeTruthy()
    })

    it('matches a path with given route param value', () => {
      setLocation('/posts/uuid-string')

      const { result } = renderHook(() =>
        useMatch('/posts/{id}', { routeParams: { id: 'uuid-string' } }),
      )

      expect(result.current.match).toBeTruthy()
    })

    it("doesn't match a path with different route param value", () => {
      setLocation('/posts/uuid-string')

      const { result } = renderHook(() =>
        useMatch('/posts/{id}', { routeParams: { id: 'other-uuid-string' } }),
      )

      expect(result.current.match).toBeFalsy()
    })

    it('matches a path with default param type', () => {
      setLocation('/posts/123')

      const { result } = renderHook(() =>
        useMatch('/posts/{id}', { routeParams: { id: '123' } }),
      )

      expect(result.current.match).toBeTruthy()
    })

    it('matches a path with a specified param type', () => {
      setLocation('/posts/123')

      const { result } = renderHook(() =>
        useMatch('/posts/{id:Int}', { routeParams: { id: 123 } }),
      )

      expect(result.current.match).toBeTruthy()
    })

    it("doesn't match a path with a specified param type with different value", () => {
      setLocation('/posts/123')

      const { result } = renderHook(() =>
        useMatch('/posts/{id:Int}', { routeParams: { id: '123' } }),
      )

      expect(result.current.match).toBeFalsy()
    })

    it('matches with a subset of param values specified (year, month)', () => {
      setLocation('/year/1970/month/08/day/21')

      const { result } = renderHook(() =>
        useMatch('/year/{year}/month/{month}/day/{day}', {
          routeParams: { year: '1970', month: '08' },
        }),
      )

      expect(result.current.match).toBeTruthy()
    })

    it('matches with a subset of param values specified (month)', () => {
      setLocation('/year/1970/month/08/day/21')

      const { result } = renderHook(() =>
        useMatch('/year/{year}/month/{month}/day/{day}', {
          routeParams: { month: '08' },
        }),
      )

      expect(result.current.match).toBeTruthy()
    })

    it('matches with a subset of param values specified (day)', () => {
      const useMatchHook = () =>
        useMatch('/year/{year}/month/{month}/day/{day}', {
          routeParams: { day: '21' },
        })

      setLocation('/year/1970/month/08/day/21')
      const { result: result1970 } = renderHook(useMatchHook)
      expect(result1970.current.match).toBeTruthy()

      setLocation('/year/1970/month/01/day/21')
      const { result: resultJan } = renderHook(useMatchHook)
      expect(resultJan.current.match).toBeTruthy()

      setLocation('/year/2024/month/08/day/21')
      const { result: result2024 } = renderHook(useMatchHook)
      expect(result2024.current.match).toBeTruthy()
    })

    it("doesn't match with a subset of wrong param values specified (month)", () => {
      setLocation('/year/1970/month/08/day/21')

      const { result } = renderHook(() =>
        useMatch('/year/{year}/month/{month}/day/{day}', {
          routeParams: { month: '01' },
        }),
      )

      expect(result.current.match).toBeFalsy()
    })

    it("doesn't match with a subset of wrong param values specified (day)", () => {
      setLocation('/year/1970/month/08/day/21')

      const { result } = renderHook(() =>
        useMatch('/year/{year}/month/{month}/day/{day}', {
          routeParams: { day: '31' },
        }),
      )

      expect(result.current.match).toBeFalsy()
    })
  })

  describe('routeParams + searchParams', () => {
    const mockLocation = createDummyLocation('/dummy-location')

    type CallbackType = () => ReturnType<typeof useMatch>
    function renderHook(cb: CallbackType) {
      return tlrRenderHook(cb, {
        wrapper: ({ children }) => (
          <LocationProvider location={mockLocation}>
            {children}
          </LocationProvider>
        ),
      })
    }

    function setLocation(pathname: string, search = '') {
      mockLocation.pathname = pathname
      mockLocation.search = search
    }

    afterEach(() => {
      setLocation('/dummy-location')
    })

    it('matches a path with literal route param', () => {
      setLocation('/test-path/foobar', '?s1=one&s2=two')

      const { result } = renderHook(() => useMatch('/test-path/{param}'))

      expect(result.current.match).toBeTruthy()
    })

    it('matches a path with literal route param and given searchParam', () => {
      setLocation('/test-path/foobar', '?s1=one&s2=two')

      const { result } = renderHook(() =>
        useMatch('/test-path/{param}', {
          searchParams: [{ s1: 'one' }],
        }),
      )

      expect(result.current.match).toBeTruthy()
    })

    it("doesn't match a path with wrong route param value and given searchParam", () => {
      setLocation('/test-path/foobar', '?s1=one&s2=two')

      const { result } = renderHook(() =>
        useMatch('/test-path/{param}', {
          routeParams: { param: 'wrong' },
          searchParams: [{ s1: 'one' }],
        }),
      )

      expect(result.current.match).toBeFalsy()
    })

    it('matches a deeper path with matchSubPaths', () => {
      setLocation('/test-path/foobar/fizz/buzz', '?s1=one&s2=two')

      const { result } = renderHook(() =>
        useMatch('/test-path/{param}/{param-two}', {
          routeParams: { ['param-two']: 'fizz' },
          searchParams: [{ s1: 'one' }],
          matchSubPaths: true,
        }),
      )

      expect(result.current.match).toBeTruthy()
    })
  })
})
