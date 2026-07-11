import * as React from 'react'
import type { ReactNode } from 'react'

import { act, render, waitFor } from '@testing-library/react'
import { beforeEach, test, describe, vi, expect } from 'vitest'

import { navigate } from '../history.js'
import { Route } from '../Route.js'
import { Router } from '../router.js'
import { Set } from '../Set.js'

// SETUP
interface LayoutProps {
  children: ReactNode
}

const ChildA = () => <h1>ChildA</h1>
const ChildB = () => <h1>ChildB</h1>
const ChildC = () => <h1>ChildC</h1>
const GlobalLayout = ({ children }: LayoutProps) => (
  <div>
    <h1>Global Layout</h1>
    {children}
    <footer>This is a footer</footer>
  </div>
)
const CustomWrapper = ({ children }: LayoutProps) => (
  <div>
    <h1>Custom Wrapper</h1>
    {children}
    <p>Custom Wrapper End</p>
  </div>
)
const BLayout = ({ children }: LayoutProps) => (
  <div>
    <h1>Layout for B</h1>
    {children}
  </div>
)

beforeEach(() => {
  window.history.pushState({}, '', '/')
})

test('wraps components in other components', async () => {
  const TestSet = () => (
    <Router>
      <Set wrap={[CustomWrapper, GlobalLayout]}>
        <ChildA />
        <Set wrap={BLayout}>
          <Route path="/" page={ChildB} name="childB" />
        </Set>
      </Set>
      <ChildC />
    </Router>
  )

  const screen = render(<TestSet />)

  await waitFor(() => screen.getByText('ChildB'))

  expect(screen.container).toMatchInlineSnapshot(`
    <div>
      <div>
        <h1>
          Custom Wrapper
        </h1>
        <div>
          <h1>
            Global Layout
          </h1>
          <div>
            <h1>
              Layout for B
            </h1>
            <h1>
              ChildB
            </h1>
            <div
              aria-atomic="true"
              aria-live="assertive"
              id="redwood-announcer"
              role="alert"
              style="position: absolute; top: 0px; width: 1px; height: 1px; padding: 0px; overflow: hidden; clip: rect(0px, 0px, 0px, 0px); white-space: nowrap; border: 0px;"
            />
          </div>
          <footer>
            This is a footer
          </footer>
        </div>
        <p>
          Custom Wrapper End
        </p>
      </div>
    </div>
  `)
})

test('passes props to wrappers', async () => {
  interface Props {
    propOne: string
    propTwo: string
    children: ReactNode
  }

  const PropWrapper = ({ children, propOne, propTwo }: Props) => (
    <div>
      <h1>Prop Wrapper</h1>
      <p>1:{propOne}</p>
      <p>2:{propTwo}</p>
      {children}
    </div>
  )

  const PropWrapperTwo = ({ children }: Props) => (
    <div>
      <h1>Prop Wrapper Two</h1>
      {children}
      <footer>This is a footer</footer>
    </div>
  )

  const TestSet = () => (
    <Router>
      <Set wrap={[PropWrapper, PropWrapperTwo]} propOne="une" propTwo="deux">
        <Route path="/" page={ChildA} name="childA" />
      </Set>
    </Router>
  )

  const screen = render(<TestSet />)

  await waitFor(() => screen.getByText('ChildA'))

  expect(screen.container).toMatchInlineSnapshot(`
    <div>
      <div>
        <h1>
          Prop Wrapper
        </h1>
        <p>
          1:
          une
        </p>
        <p>
          2:
          deux
        </p>
        <div>
          <h1>
            Prop Wrapper Two
          </h1>
          <h1>
            ChildA
          </h1>
          <div
            aria-atomic="true"
            aria-live="assertive"
            id="redwood-announcer"
            role="alert"
            style="position: absolute; top: 0px; width: 1px; height: 1px; padding: 0px; overflow: hidden; clip: rect(0px, 0px, 0px, 0px); white-space: nowrap; border: 0px;"
          />
          <footer>
            This is a footer
          </footer>
        </div>
      </div>
    </div>
  `)
})

describe('Navigating Sets', () => {
  const HomePage = () => <h1>Home Page</h1>
  const Page = () => <h1>Page</h1>

  test('Sets should not cause a re-mount of wrap components when navigating within the set', async () => {
    const layoutOneMount = vi.fn()
    const layoutOneUnmount = vi.fn()

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

    const Routes = () => (
      <Router>
        <Route path="/" page={HomePage} name="home" />
        <Set wrap={Layout1}>
          <Route path="/posts/new" page={Page} name="newPost" />
          <Route path="/posts/{id:Int}/edit" page={Page} name="editPost" />
          <Route path="/posts/{id:Int}" page={Page} name="post" />
          <Route path="/posts" page={Page} name="posts" />
        </Set>
      </Router>
    )

    render(<Routes />)

    act(() => navigate('/'))
    act(() => navigate('/posts'))
    act(() => navigate('/posts/new'))
    act(() => navigate('/posts'))
    act(() => navigate('/posts/1'))
    act(() => navigate('/posts/new'))
    act(() => navigate('/posts'))

    // Navigating into, and then within Layout1 should not cause a re-mount
    expect(layoutOneMount).toHaveBeenCalledTimes(1)
    expect(layoutOneUnmount).toHaveBeenCalledTimes(0)
  })

  test('Sets should make wrap components remount when navigating between separate sets with the same wrap component', async () => {
    const layoutOneMount = vi.fn()
    const layoutOneUnmount = vi.fn()

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

    const Routes = () => (
      <Router>
        <Route path="/" page={HomePage} name="home" />
        <Set wrap={Layout1}>
          <Route path="/posts" page={Page} name="posts" />
        </Set>
        <Set wrap={Layout1}>
          <Route path="/comments" page={Page} name="comments" />
        </Set>
      </Router>
    )

    render(<Routes />)

    act(() => navigate('/'))

    expect(layoutOneMount).toHaveBeenCalledTimes(0)
    expect(layoutOneUnmount).toHaveBeenCalledTimes(0)

    act(() => navigate('/posts'))

    expect(layoutOneMount).toHaveBeenCalledTimes(1)
    expect(layoutOneUnmount).toHaveBeenCalledTimes(0)

    act(() => navigate('/'))

    expect(layoutOneMount).toHaveBeenCalledTimes(1)
    expect(layoutOneUnmount).toHaveBeenCalledTimes(1)

    act(() => navigate('/posts'))

    expect(layoutOneMount).toHaveBeenCalledTimes(2)
    expect(layoutOneUnmount).toHaveBeenCalledTimes(1)

    // This is the real test. Navigating between /posts and /comments should
    // remount the wrap component because even though it's the same component,
    // it's in different sets.
    act(() => navigate('/comments'))

    expect(layoutOneMount).toHaveBeenCalledTimes(3)
    expect(layoutOneUnmount).toHaveBeenCalledTimes(2)

    act(() => navigate('/'))

    expect(layoutOneMount).toHaveBeenCalledTimes(3)
    expect(layoutOneUnmount).toHaveBeenCalledTimes(3)
  })
})
