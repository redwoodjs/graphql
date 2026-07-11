import * as React from 'react'
import type { ReactNode } from 'react'

import { act, render } from '@testing-library/react'
import { beforeEach, beforeAll, afterAll, test, expect, vi } from 'vitest'

import { navigate, Route, Router } from '../index.js'
import { Private, Set } from '../Set.js'

// Heads-up, in this test we're not mocking LazyComponent because all the tests
// explicitly define the pages in the router.
//
// If you add tests with dynamic imports, i.e. all the pages aren't explicitly
// supplied to the router, then you'll need to mock LazyComponent (see
// router.test.tsx)

const HomePage = () => <h1>Home Page</h1>
const Page = () => <h1>Page</h1>

interface LayoutProps {
  children: ReactNode
}

beforeEach(() => {
  window.history.pushState({}, '', '/')
})

let err: typeof console.error

beforeAll(() => {
  // Hide thrown exceptions. We're expecting them, and they clutter the output
  err = console.error
  console.error = vi.fn()
})

afterAll(() => {
  console.error = err
})

test('Sets nested in Private should not error out if no authenticated prop provided', () => {
  const Layout1 = ({ children }: LayoutProps) => (
    <div>
      <p>Layout1</p>
      {children}
    </div>
  )

  const SetInsidePrivate = () => (
    <Router>
      <Route path="/" page={HomePage} name="home" />
      <Route path="/auth" page={() => 'Regular Auth'} name="auth" />
      <Route path="/adminAuth" page={() => 'Admin Auth'} name="adminAuth" />
      <Private unauthenticated="auth">
        <Route path="/two/{slug}" page={Page} name="two" />
        {/* The Set below is private implicitly (nested under private), but
        should not need an unauthenticated prop */}
        <Set wrap={Layout1}>
          <Private roles="admin" unauthenticated="adminAuth">
            <Route path="/three" page={Page} name="three" />
          </Private>
        </Set>
      </Private>
      <Set wrap={Layout1} private>
        <Route path="/four" page={Page} name="four" />
      </Set>
    </Router>
  )

  render(<SetInsidePrivate />)

  expect(() => {
    act(() => navigate('/three'))
  }).not.toThrowError()

  // But still throws if you try to navigate to a private route without an unauthenticated prop
  expect(() => {
    act(() => navigate('/four'))
  }).toThrowError('You must specify an `unauthenticated` route')
})

test('Sets nested in `<Set private>` should not error out if no authenticated prop provided', () => {
  const Layout1 = ({ children }: { children: ReactNode }) => (
    <div>
      <p>Layout1</p>
      {children}
    </div>
  )

  const SetInsideSetPrivate = () => (
    <Router>
      <Route path="/" page={HomePage} name="home" />
      <Route path="/auth" page={() => 'Regular Auth'} name="auth" />
      <Route path="/adminAuth" page={() => 'Admin Auth'} name="adminAuth" />
      <Set private unauthenticated="auth">
        <Route path="/two/{slug}" page={Page} name="two" />
        {/* The Set below is private implicitly (nested under private), but
        should not need an unauthenticated prop */}
        <Set wrap={Layout1}>
          <Private roles="admin" unauthenticated="adminAuth">
            <Route path="/three" page={Page} name="three" />
          </Private>
        </Set>
      </Set>
      <Set wrap={Layout1} private>
        <Route path="/four" page={Page} name="four" />
      </Set>
    </Router>
  )

  render(<SetInsideSetPrivate />)

  expect(() => act(() => navigate('/three'))).not.toThrowError()

  // But still throws if you try to navigate to a private route without an unauthenticated prop
  expect(() => act(() => navigate('/four'))).toThrowError(
    'You must specify an `unauthenticated` route',
  )
})

test('Nested sets should not cause a re-mount of parent wrap components', async () => {
  const layoutOneMount = vi.fn()
  const layoutOneUnmount = vi.fn()
  const layoutTwoMount = vi.fn()
  const layoutTwoUnmount = vi.fn()

  const Layout1 = ({ children }: LayoutProps) => {
    React.useEffect(() => {
      // Called on mount and re-mount of this layout
      layoutOneMount()

      return () => {
        layoutOneUnmount()
      }
    }, [])

    return (
      <>
        <p>ONE</p>
        {children}
      </>
    )
  }

  const Layout2 = ({ children }: LayoutProps) => {
    React.useEffect(() => {
      // Called on mount and re-mount of this layout
      layoutTwoMount()

      return () => {
        layoutTwoUnmount()
      }
    }, [])

    return (
      <>
        <p>TWO</p>
        {children}
      </>
    )
  }

  const NestedSetsWithWrap = () => (
    <Router>
      <Set wrap={Layout1}>
        <Route path="/" page={HomePage} name="home" />
        <Set wrap={Layout2}>
          <Route path="/posts/new" page={Page} name="newPost" />
          <Route path="/posts/{id:Int}/edit" page={Page} name="editPost" />
          <Route path="/posts/{id:Int}" page={Page} name="post" />
          <Route path="/posts" page={Page} name="posts" />
        </Set>
      </Set>
    </Router>
  )

  render(<NestedSetsWithWrap />)

  // Layout 1 is mounted on initial render because we start out on /
  // Layout 2 is not mounted at all
  expect(layoutOneMount).toHaveBeenCalledTimes(1)
  expect(layoutOneUnmount).toHaveBeenCalledTimes(0)
  expect(layoutTwoMount).toHaveBeenCalledTimes(0)
  expect(layoutTwoUnmount).toHaveBeenCalledTimes(0)

  act(() => navigate('/'))

  // Haven't navigated anywhere, so nothing should have changed
  expect(layoutOneMount).toHaveBeenCalledTimes(1)
  expect(layoutOneUnmount).toHaveBeenCalledTimes(0)
  expect(layoutTwoMount).toHaveBeenCalledTimes(0)
  expect(layoutTwoUnmount).toHaveBeenCalledTimes(0)

  act(() => navigate('/posts'))

  // Layout 2 should now have been mounted
  // We're still within Layout 1, so it should not have been unmounted
  expect(layoutOneMount).toHaveBeenCalledTimes(1)
  expect(layoutOneUnmount).toHaveBeenCalledTimes(0)
  expect(layoutTwoMount).toHaveBeenCalledTimes(1)
  expect(layoutTwoUnmount).toHaveBeenCalledTimes(0)

  act(() => navigate('/'))

  // Navigating back up to / should unmount Layout 2 but crucially not remount
  // Layout 1
  expect(layoutOneMount).toHaveBeenCalledTimes(1)
  expect(layoutOneUnmount).toHaveBeenCalledTimes(0)
  expect(layoutTwoMount).toHaveBeenCalledTimes(1)
  expect(layoutTwoUnmount).toHaveBeenCalledTimes(1)

  act(() => navigate('/posts'))

  // Going back to /posts should remount Layout 2 but not Layout 1
  expect(layoutOneMount).toHaveBeenCalledTimes(1)
  expect(layoutOneUnmount).toHaveBeenCalledTimes(0)
  expect(layoutTwoMount).toHaveBeenCalledTimes(2)
  expect(layoutTwoUnmount).toHaveBeenCalledTimes(1)

  act(() => navigate('/posts'))

  // Navigating within Layout 2 should not remount any of the layouts
  expect(layoutOneMount).toHaveBeenCalledTimes(1)
  expect(layoutOneUnmount).toHaveBeenCalledTimes(0)
  expect(layoutTwoMount).toHaveBeenCalledTimes(2)
  expect(layoutTwoUnmount).toHaveBeenCalledTimes(1)

  act(() => navigate('/'))

  // Back up to / again and we should see Layout 2 unmount
  expect(layoutOneMount).toHaveBeenCalledTimes(1)
  expect(layoutOneUnmount).toHaveBeenCalledTimes(0)
  expect(layoutTwoMount).toHaveBeenCalledTimes(2)
  expect(layoutTwoUnmount).toHaveBeenCalledTimes(2)
})
