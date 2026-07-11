let mockDelay = 0
vi.mock('../page.js', async (importOriginal) => {
  const actualUtil = await importOriginal<PageType>()
  const { lazy } = await vi.importActual<typeof React>('react')

  return {
    ...actualUtil,
    normalizePage: (specOrPage: Spec | React.ComponentType<unknown>) => ({
      name: specOrPage.name,
      prerenderLoader: () => ({ default: specOrPage }),
      LazyComponent: lazy(
        () =>
          new Promise<any>((resolve) =>
            setTimeout(() => resolve({ default: specOrPage }), mockDelay),
          ),
      ),
    }),
  }
})

import React, { useEffect, useState } from 'react'

import { act, configure, render, waitFor } from '@testing-library/react'
import { vi, beforeEach, afterEach, test, expect } from 'vitest'

import type { AuthContextInterface } from '@redwoodjs/auth'

import {
  navigate,
  Private,
  PrivateSet,
  Redirect,
  Route,
  Router,
  Set,
  useParams,
} from '../index.js'
import { useLocation } from '../location.js'
import type { Spec, PageType } from '../page.js'
import { usePageLoadingContext } from '../PageLoadingContext.js'

// Running into intermittent test timeout behavior in
// https://github.com/redwoodjs/redwood/pull/4992
// Attempting to work around by bumping the default timeout of 5000
const timeoutForFlakeyAsyncTests = 8000

configure({
  asyncUtilTimeout: 5_000,
})

beforeEach(() => {
  window.history.pushState({}, '', '/')
})

type UnknownAuthContextInterface = AuthContextInterface<
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown
>

function createDummyAuthContextValues(
  partial: Partial<UnknownAuthContextInterface>,
) {
  const authContextValues: UnknownAuthContextInterface = {
    loading: true,
    isAuthenticated: false,
    userMetadata: null,
    currentUser: null,
    logIn: async () => null,
    logOut: async () => null,
    signUp: async () => null,
    getToken: async () => null,
    getCurrentUser: async () => null,
    hasRole: () => false,
    reauthenticate: async () => {},
    client: null,
    type: 'custom',
    hasError: false,
    forgotPassword: async () => null,
    resetPassword: async () => null,
    validateResetToken: async () => null,
  }

  return { ...authContextValues, ...partial }
}

interface MockAuth {
  isAuthenticated?: boolean
  loading?: boolean
  hasRole?: boolean | ((role: string[]) => boolean)
  loadingTimeMs?: number
}

const mockUseAuth =
  (
    {
      isAuthenticated = false,
      loading = false,
      hasRole = false,
      loadingTimeMs,
    }: MockAuth = {
      isAuthenticated: false,
      loading: false,
      hasRole: false,
    },
  ) =>
  () => {
    const [authLoading, setAuthLoading] = useState(loading)
    const [authIsAuthenticated, setAuthIsAuthenticated] =
      useState(isAuthenticated)

    useEffect(() => {
      let timer: NodeJS.Timeout | undefined
      if (loadingTimeMs) {
        timer = setTimeout(() => {
          setAuthLoading(false)
          setAuthIsAuthenticated(true)
        }, loadingTimeMs)
      }
      return () => {
        if (timer) {
          clearTimeout(timer)
        }
      }
    }, [])

    return createDummyAuthContextValues({
      loading: authLoading,
      isAuthenticated: authIsAuthenticated,
      hasRole: typeof hasRole === 'boolean' ? () => hasRole : hasRole,
    })
  }

interface LayoutProps {
  children: React.ReactNode
}

const HomePage = () => <h1>Home Page</h1>
const LoginPage = () => <h1>Login Page</h1>
const AboutPage = () => <h1>About Page</h1>
const PrivatePage = () => <h1>Private Page</h1>
const RedirectPage = () => <Redirect to="/about" />
const NotFoundPage = () => <h1>404</h1>
const ParamPage = ({ value, q }: { value: string; q: string }) => {
  const params = useParams()

  return (
    <div>
      <p>param {`${value}${q}`}</p>
      <p>hook params {`${params.value}?${params.q}`}</p>
    </div>
  )
}
const LocationPage = () => {
  const location = useLocation()

  return (
    <>
      <h1>Location Page</h1>
      <p>{location.pathname}</p>
    </>
  )
}

const HomePagePlaceholder = () => <>HomePagePlaceholder</>
const AboutPagePlaceholder = () => <>AboutPagePlaceholder</>
const ParamPagePlaceholder = () => <>ParamPagePlaceholder</>
const RedirectPagePlaceholder = () => <>RedirectPagePlaceholder</>
const PrivatePagePlaceholder = () => <>PrivatePagePlaceholder</>
const LoginPagePlaceholder = () => <>LoginPagePlaceholder</>

const PageLoadingContextLayout = ({ children }: LayoutProps) => {
  const { loading } = usePageLoadingContext()

  return (
    <>
      <h1>Page Loading Context Layout</h1>
      {loading && <p>loading in layout...</p>}
      {!loading && <p>done loading in layout</p>}
      {children}
    </>
  )
}

const PageLoadingContextPage = () => {
  const { loading } = usePageLoadingContext()

  return (
    <>
      <h1>Page Loading Context Page</h1>
      {loading && <p>loading in page...</p>}
      {!loading && <p>done loading in page</p>}
    </>
  )
}

const TestRouter = ({
  authenticated,
  hasRole,
}: {
  authenticated?: boolean
  hasRole?: boolean
}) => (
  <Router
    useAuth={mockUseAuth({ isAuthenticated: authenticated, hasRole })}
    pageLoadingDelay={0}
  >
    <Route
      path="/"
      page={HomePage}
      name="home"
      whileLoadingPage={HomePagePlaceholder}
    />
    <Route
      path="/about"
      page={AboutPage}
      name="about"
      whileLoadingPage={AboutPagePlaceholder}
    />
    <Route
      path="/redirect"
      page={RedirectPage}
      name="redirect"
      whileLoadingPage={RedirectPagePlaceholder}
    />
    <Route path="/redirect2/{value}" redirect="/param-test/{value}" />
    <Route
      path="/login"
      page={LoginPage}
      name="login"
      whileLoadingPage={LoginPagePlaceholder}
    />
    <PrivateSet unauthenticated="login">
      <Route
        path="/private"
        page={PrivatePage}
        name="private"
        whileLoadingPage={PrivatePagePlaceholder}
      />
    </PrivateSet>
    <PrivateSet unauthenticated="login" roles="admin">
      <Route
        path="/private_with_role"
        page={PrivatePage}
        name="private_with_role"
        whileLoadingPage={PrivatePagePlaceholder}
      />
    </PrivateSet>
    {/* Keeping this one around for now, so we don't accidentally break
      Private until we're ready to remove it */}
    <Private unauthenticated="login" roles={['admin', 'moderator']}>
      <Route
        path="/private_with_several_roles"
        page={PrivatePage}
        name="private_with_several_roles"
        whileLoadingPage={PrivatePagePlaceholder}
      />
    </Private>
    <Route
      path="/param-test/{value}"
      page={ParamPage}
      name="params"
      whileLoadingPage={ParamPagePlaceholder}
    />
    <Route path="/location" page={LocationPage} name="home" />
    <Set wrap={PageLoadingContextLayout}>
      <Route
        path="/page-loading-context"
        page={PageLoadingContextPage}
        name="pageLoadingContext"
      />
    </Set>
    <Route notfound page={NotFoundPage} />
  </Router>
)

beforeEach(() => {
  // One of the tests modifies this, so we need to reset it before each test
  mockDelay = 400
})

afterEach(() => {
  mockDelay = 0
})

test(
  'Basic home page',
  async () => {
    const screen = render(<TestRouter />)

    await waitFor(() => screen.getByText('HomePagePlaceholder'))
    await waitFor(() => screen.getByText('Home Page'))
  },
  timeoutForFlakeyAsyncTests,
)

test(
  'Navigation',
  async () => {
    const screen = render(<TestRouter />)
    // TODO: implement pageLoadDelay (potentially not needed with preloading
    // features)
    // Above TODO added in https://github.com/redwoodjs/redwood/pull/8392
    // First we should render an empty page while waiting for pageLoadDelay to
    // pass
    // expect(screen.container).toBeEmptyDOMElement()

    // Then we should render whileLoadingPage
    await waitFor(() => screen.getByText('HomePagePlaceholder'))

    // Finally we should render the actual page
    await waitFor(() => screen.getByText('Home Page'))

    act(() => navigate('/about'))

    // Now after navigating we should keep rendering the previous page until
    // the new page has loaded, or until pageLoadDelay has passed. This
    // ensures we don't show a "white flash", i.e. render an empty page, while
    // navigating the page
    expect(screen.container).not.toBeEmptyDOMElement()
    await waitFor(() => screen.getByText('Home Page'))
    expect(screen.container).not.toBeEmptyDOMElement()

    // As for HomePage we first render the placeholder...
    await waitFor(() => screen.getByText('AboutPagePlaceholder'))
    // ...and then the actual page
    await waitFor(() => screen.getByText('About Page'))
  },
  timeoutForFlakeyAsyncTests,
)

test(
  'Redirect page',
  async () => {
    act(() => navigate('/redirect'))
    const screen = render(<TestRouter />)
    await waitFor(() => screen.getByText('RedirectPagePlaceholder'))
    await waitFor(() => screen.getByText('About Page'))
  },
  timeoutForFlakeyAsyncTests,
)

test(
  'Redirect route',
  async () => {
    const screen = render(<TestRouter />)
    await waitFor(() => screen.getByText('HomePagePlaceholder'))
    await waitFor(() => screen.getByText('Home Page'))
    act(() => navigate('/redirect2/redirected?q=-cue'))
    await waitFor(() => screen.getByText('ParamPagePlaceholder'))
    await waitFor(() => screen.getByText('param redirected-cue'))
  },
  timeoutForFlakeyAsyncTests,
)

test(
  'Private page when not authenticated',
  async () => {
    act(() => navigate('/private'))
    const screen = render(<TestRouter />)
    await waitFor(() => {
      expect(
        screen.queryByText('PrivatePagePlaceholder'),
      ).not.toBeInTheDocument()
      expect(screen.queryByText('Private Page')).not.toBeInTheDocument()
      expect(screen.queryByText('LoginPagePlaceholder')).toBeInTheDocument()
    })
    await waitFor(() => screen.getByText('Login Page'))
  },
  timeoutForFlakeyAsyncTests,
)

test(
  'Private page when authenticated',
  async () => {
    act(() => navigate('/private'))
    const screen = render(<TestRouter authenticated={true} />)

    await waitFor(() => screen.getByText('PrivatePagePlaceholder'))
    await waitFor(() => screen.getByText('Private Page'))
    await waitFor(() => {
      expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
    })
  },
  timeoutForFlakeyAsyncTests,
)

test(
  'Private page when authenticated but does not have the role',
  async () => {
    act(() => navigate('/private_with_role'))
    const screen = render(<TestRouter authenticated={true} hasRole={false} />)

    await waitFor(() => {
      expect(
        screen.queryByText('PrivatePagePlaceholder'),
      ).not.toBeInTheDocument()
      expect(screen.queryByText('Private Page')).not.toBeInTheDocument()
      expect(screen.queryByText('LoginPagePlaceholder')).toBeInTheDocument()
    })
    await waitFor(() => screen.getByText('Login Page'))
  },
  timeoutForFlakeyAsyncTests,
)

test(
  'Private page when authenticated but does have the role',
  async () => {
    act(() => navigate('/private_with_role'))
    const screen = render(<TestRouter authenticated={true} hasRole={true} />)

    await waitFor(() => {
      expect(
        screen.queryByText('PrivatePagePlaceholder'),
      ).not.toBeInTheDocument()
      expect(screen.queryByText('Private Page')).toBeInTheDocument()
    })
  },
  timeoutForFlakeyAsyncTests,
)

test(
  'useLocation',
  async () => {
    act(() => navigate('/location'))
    const screen = render(<TestRouter />)
    await waitFor(() => screen.getByText('Location Page'))
    await waitFor(() => screen.getByText('/location'))

    act(() => navigate('/about'))
    // After navigating we will keep rendering the previous page for 100 ms,
    // (which is our configured delay) before rendering the "whileLoading"
    // page.
    // TODO: We don't currently implement page loading delay anymore as of
    // https://github.com/redwoodjs/redwood/pull/8392. See if we should add
    // that back in.
    // await waitFor(() => screen.getByText('Location Page'))

    // Because we're still rendering the LocationPage, the pathname returned
    // by useLocation should still be /location
    // But because of a limitation in our implementation, that's currently
    // not the case.
    // TODO: Update this test when #3779 is fixed. (It'll start failing).
    // Should get rid of the waitFor below and use the one that's currently
    // commented out. (Test disabled as of
    // https://github.com/redwoodjs/redwood/pull/8392)
    // await waitFor(() => screen.getByText('/about'))
    // // await waitFor(() => screen.getByText('/location'))

    // And then we'll render the placeholder...
    await waitFor(() => screen.getByText('AboutPagePlaceholder'))
    // ...followed by the actual page
    await waitFor(() => screen.getByText('About Page'))
  },
  timeoutForFlakeyAsyncTests,
)

test(
  'path params should never be empty',
  async () => {
    const PathParamPage = ({ value }: { value: string }) => {
      expect(value).not.toBeFalsy()
      return <p>{value}</p>
    }

    const TestRouter = () => (
      <Router pageLoadingDelay={100}>
        <Route
          path="/about"
          page={AboutPage}
          name="about"
          whileLoadingPage={AboutPagePlaceholder}
        />
        <Route
          path="/path-param-test/{value}"
          page={PathParamPage}
          name="params"
          whileLoadingPage={ParamPagePlaceholder}
        />
      </Router>
    )

    act(() => navigate('/path-param-test/test_value'))
    const screen = render(<TestRouter />)

    // First we render the path parameter value "test_value"
    await waitFor(() => screen.getByText('test_value'))

    act(() => navigate('/about'))
    // After navigating we should keep displaying the old path value...
    await waitFor(() => screen.getByText('test_value'))
    // ...until we switch over to render the about page loading component...
    await waitFor(() => screen.getByText('AboutPagePlaceholder'))
    // ...followed by the actual page
    await waitFor(() => screen.getByText('About Page'))
  },
  timeoutForFlakeyAsyncTests,
)

test(
  'usePageLoadingContext',
  async () => {
    // We want to show a loading indicator if loading pages is taking a long
    // time. But at the same time we don't want to show it right away, because
    // then there'll be a flash of the loading indicator on every page load.
    // So we have a `pageLoadingDelay` delay to control how long it waits
    // before showing the loading state (default is 1000 ms).
    //
    // RW lazy loads pages by default, that's why it could potentially take a
    // while to load a page. But during tests we don't do that. So we have to
    // fake a delay. That's what `mockDelay` is for. `mockDelay` has to be
    // longer than `pageLoadingDelay`, but not too long so the test takes
    // longer than it has to, and also not too long so the entire test times
    // out.

    // Had to increase this to make the test pass on Windows
    mockDelay = 700

    // <TestRouter> sets pageLoadingDelay={200}. (Default is 1000.)
    const screen = render(<TestRouter />)

    act(() => navigate('/page-loading-context'))

    // 'Page Loading Context Layout' should always be shown
    await waitFor(() => screen.getByText('Page Loading Context Layout'))

    // 'loading in layout...' should only be shown while the page is loading.
    // So in this case, for the first 700ms
    await waitFor(() => screen.getByText('loading in layout...'))

    // After 700ms 'Page Loading Context Page' should be rendered
    await waitFor(() => screen.getByText('Page Loading Context Page'))

    // This shouldn't show up, because the page shouldn't render before it's
    // fully loaded
    expect(screen.queryByText('loading in page...')).not.toBeInTheDocument()

    await waitFor(() => screen.getByText('done loading in page'))
    await waitFor(() => screen.getByText('done loading in layout'))
  },
  timeoutForFlakeyAsyncTests,
)
