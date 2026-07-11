import React, { useEffect, useState } from 'react'

import { act, fireEvent, render, waitFor } from '@testing-library/react'
import {
  beforeEach,
  describe,
  test,
  beforeAll,
  afterAll,
  expect,
  vi,
} from 'vitest'

import type { AuthContextInterface, UseAuth } from '@redwoodjs/auth'

import type { GeneratedRoutesMap } from '../analyzeRoutes.js'
import {
  back,
  routes as generatedRoutes,
  Link,
  navigate,
  Private,
  PrivateSet,
  Redirect,
  Route,
  Router,
} from '../index.js'
import { useParams } from '../params.js'
import { Set } from '../Set.js'

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

// The types are generated in the user's project
const routes = generatedRoutes as GeneratedRoutesMap

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
      <p>hookparams {`${params.value}?${params.q}`}</p>
    </div>
  )
}

beforeEach(() => {
  window.history.pushState({}, '', '/')
  Object.keys(routes).forEach((key) => delete routes[key])
})

describe('inits routes and navigates as expected', () => {
  const TestRouter = () => (
    <Router>
      <Route path="/" page={HomePage} name="home" />
      <Route path="/about" page={AboutPage} name="about" />
      <Route path="/redirect" page={RedirectPage} name="redirect" />
      <Route path="/redirect2/{value}" redirect="/param-test/{value}" />
      <PrivateSet unauthenticated="home">
        <Route path="/private" page={PrivatePage} name="private" />
      </PrivateSet>
      <Route path="/param-test/{value}" page={ParamPage} name="params" />
      <Route notfound page={NotFoundPage} />
    </Router>
  )

  const getScreen = () => render(<TestRouter />)

  test('starts on home page', async () => {
    const screen = getScreen()
    await waitFor(() => screen.getByText(/Home Page/i))
  })

  test('navigate to about page', async () => {
    const screen = getScreen()
    act(() => navigate(routes.about()))
    await waitFor(() => screen.getByText(/About Page/i))
  })

  test('passes search params to the page', async () => {
    const screen = getScreen()
    act(() => navigate(routes.params({ value: 'val', q: 'q' })))
    await waitFor(() => {
      expect(screen.queryByText('param valq')).toBeInTheDocument()
      expect(screen.queryByText('hookparams val?q')).toBeInTheDocument()
    })
  })

  test('navigate to redirect page should redirect to about', async () => {
    const screen = getScreen()

    act(() => navigate(routes.redirect()))
    await waitFor(() => {
      expect(screen.queryByText(/Redirect Page/)).not.toBeInTheDocument()
      expect(screen.queryByText(/About Page/)).toBeInTheDocument()
    })
  })

  test('navigate to redirect2 should forward params', async () => {
    const screen = getScreen()

    await waitFor(() => screen.getByText(/Home Page/i))

    act(() => navigate('/redirect2/redirected?q=cue'))
    await waitFor(() => screen.getByText(/param redirectedcue/i))

    act(() => navigate('/redirect2/redirected'))
    await waitFor(() => screen.getByText(/param redirected/))
  })

  test('multiple navigates to params page should update params', async () => {
    const screen = getScreen()
    act(() => navigate(routes.params({ value: 'one' })))
    await waitFor(() => screen.getByText(/param one/i))

    act(() => navigate(routes.params({ value: 'two' })))
    await waitFor(() => screen.getByText(/param two/i))
  })

  test('notfound page catches undefined paths', async () => {
    const screen = getScreen()
    act(() => navigate('/no/route/defined'))
    await waitFor(() => screen.getByText('404'))
  })
})

describe('test params escaping', () => {
  const ParamPage = ({ value, q }: { value: string; q: string }) => {
    const params = useParams()

    return (
      <div>
        <p>param {`${value}${q}`}</p>
        <p>hookparams {`${params.value}?${params.q}`}</p>
      </div>
    )
  }

  const TestRouter = () => (
    <Router>
      <Route path="/redirect2/{value}" redirect="/param-test/{value}" />
      <Route path="/param-test/{value}" page={ParamPage} name="params" />
      <Route notfound page={NotFoundPage} />
    </Router>
  )

  const getScreen = () => render(<TestRouter />)

  test('Params with unreserved characters work in path and query', async () => {
    const screen = getScreen()
    act(() =>
      navigate(routes.params({ value: 'example.com', q: 'example.com' })),
    )
    await waitFor(() => {
      expect(
        screen.queryByText('param example.comexample.com'),
      ).toBeInTheDocument()
      expect(
        screen.queryByText('hookparams example.com?example.com'),
      ).toBeInTheDocument()
    })
  })

  test('Params with reserved characters work in path and query', async () => {
    const screen = getScreen()
    act(() =>
      navigate(routes.params({ value: 'example!com', q: 'example!com' })),
    )

    await waitFor(() => {
      expect(
        screen.queryByText('param example!comexample!com'),
      ).toBeInTheDocument()
      expect(
        screen.queryByText('hookparams example!com?example!com'),
      ).toBeInTheDocument()
    })
  })

  test('Params with unsafe characters work in query, are escaped in path', async () => {
    const screen = getScreen()
    act(() =>
      navigate(routes.params({ value: 'example com', q: 'example com' })),
    )

    await waitFor(() => {
      expect(
        screen.queryByText('param example%20comexample com'),
      ).toBeInTheDocument()
      expect(
        screen.queryByText('hookparams example%20com?example com'),
      ).toBeInTheDocument()
    })
  })

  test('Character / is valid as part of a param in query', async () => {
    const screen = getScreen()
    act(() => navigate(routes.params({ value: 'example', q: 'example/com' })))

    await waitFor(() => {
      expect(screen.queryByText('param exampleexample/com')).toBeInTheDocument()
      expect(
        screen.queryByText('hookparams example?example/com'),
      ).toBeInTheDocument()
    })
  })

  test('Character / is not captured as part of a param in path', async () => {
    const screen = getScreen()
    act(() =>
      navigate(routes.params({ value: 'example/com', q: 'example/com' })),
    )

    await waitFor(() => screen.getByText('404'))
  })

  test('navigate to redirect2 should forward params with unreserved characters', async () => {
    const screen = getScreen()
    act(() => navigate('/redirect2/example.com?q=example.com'))
    await waitFor(() => screen.getByText(/param example.comexample.com/i))
  })

  test('navigate to redirect2 should forward params with escaped characters', async () => {
    const screen = getScreen()
    act(() => navigate('/redirect2/example!com?q=example!com'))
    await waitFor(() => screen.getByText(/param example!comexample!com/i))
  })
})

describe('query params should not override path params', () => {
  const ParamPage = ({ id, contactId }: { id: number; contactId: number }) => {
    const params = useParams()

    return (
      <div>
        <p>param {`${id},${contactId}`}</p>
        <p>hookparams {`${params.id},${params.contactId}`}</p>
      </div>
    )
  }

  const TestRouter = () => (
    <Router>
      <Route
        path="/user/{id:Int}/contact/{contactId:Int}"
        page={ParamPage}
        name="contact"
      />
    </Router>
  )

  const getScreen = () => render(<TestRouter />)

  test('query params of same key as path params should not override path params', async () => {
    const screen = getScreen()
    act(() => navigate('/user/1/contact/2?contactId=two'))
    await waitFor(() => {
      expect(screen.queryByText('param 1,2')).toBeInTheDocument()
      expect(screen.queryByText('hookparams 1,2')).toBeInTheDocument()
    })
  })
})

test('unauthenticated user is redirected away from private page', async () => {
  const TestRouter = () => (
    <Router>
      <Route path="/" page={HomePage} name="home" />
      <Route path="/login" page={LoginPage} name="login" />
      <Route path="/about" page={AboutPage} name="about" />
      <PrivateSet unauthenticated="login">
        <Route path="/private" page={PrivatePage} name="private" />
      </PrivateSet>
    </Router>
  )
  const screen = render(<TestRouter />)

  // starts on home page
  await waitFor(() => screen.getByText(/Home Page/i))

  // navigate to private page
  // should redirect to login
  act(() => navigate(routes.private()))

  await waitFor(() => {
    expect(screen.queryByText(/Private Page/i)).not.toBeInTheDocument()
    screen.getByText(/Login Page/i)
    expect(window.location.pathname).toBe('/login')
    expect(window.location.search).toBe('?redirectTo=/private')
  })
})

test('unauthenticated user is redirected including search params', async () => {
  const TestRouter = () => (
    <Router>
      <Route path="/" page={HomePage} name="home" />
      <Route path="/login" page={LoginPage} name="login" />
      <PrivateSet unauthenticated="login">
        <Route path="/private" page={PrivatePage} name="private" />
      </PrivateSet>
    </Router>
  )
  const screen = render(<TestRouter />)

  // starts on home page
  await waitFor(() => screen.getByText(/Home Page/i))

  // navigate to private page
  // should redirect to login
  act(() => navigate(routes.private({ bazinga: 'yeah' })))

  await waitFor(() => {
    expect(screen.queryByText(/Private Page/i)).not.toBeInTheDocument()
    expect(window.location.pathname).toBe('/login')
    expect(window.location.search).toBe(
      `?redirectTo=/private${encodeURIComponent('?bazinga=yeah')}`,
    )
    screen.getByText(/Login Page/i)
  })
})

test('authenticated user can access private page', async () => {
  const TestRouter = () => (
    <Router useAuth={mockUseAuth({ isAuthenticated: true })}>
      <Route path="/" page={HomePage} name="home" />
      <PrivateSet unauthenticated="home">
        <Route path="/private" page={PrivatePage} name="private" />
      </PrivateSet>
    </Router>
  )
  const screen = render(<TestRouter />)

  // starts on home page
  await waitFor(() => screen.getByText(/Home Page/i))

  // navigate to private page
  // should not redirect
  act(() => navigate(routes.private()))
  await waitFor(() => {
    expect(screen.getByText(/Private Page/)).toBeInTheDocument()
    expect(screen.queryByText(/Home Page/)).not.toBeInTheDocument()
  })
})

test('can display a loading screen whilst waiting for auth', async () => {
  const TestRouter = () => (
    <Router useAuth={mockUseAuth({ isAuthenticated: false, loading: true })}>
      <Route path="/" page={HomePage} name="home" />
      <PrivateSet
        unauthenticated="home"
        whileLoadingAuth={() => <>Authenticating...</>}
      >
        <Route path="/private" page={PrivatePage} name="private" />
      </PrivateSet>
    </Router>
  )
  const screen = render(<TestRouter />)

  // starts on home page
  await waitFor(() => screen.getByText(/Home Page/i))

  // navigate to private page
  // should not redirect
  act(() => navigate(routes.private()))
  await waitFor(() => {
    expect(screen.getByText(/Authenticating.../)).toBeInTheDocument()
    expect(screen.queryByText(/Home Page/)).not.toBeInTheDocument()
  })
})

test('can display a loading screen with a hook', async () => {
  const HookLoader = () => {
    const [showStill, setShowStill] = useState(false)

    useEffect(() => {
      const timer = setTimeout(() => setShowStill(true), 100)
      return () => clearTimeout(timer)
    }, [])

    return <>{showStill ? 'Still authenticating...' : 'Authenticating...'}</>
  }

  const TestRouter = () => (
    <Router
      useAuth={mockUseAuth({
        isAuthenticated: false,
        loading: true,
        loadingTimeMs: 700,
      })}
    >
      <Route path="/" page={HomePage} name="home" />
      <PrivateSet unauthenticated="home" whileLoadingAuth={HookLoader}>
        <Route path="/private" page={PrivatePage} name="private" />
      </PrivateSet>
    </Router>
  )
  const screen = render(<TestRouter />)

  // starts on home page
  await waitFor(() => screen.getByText(/Home Page/i))

  // navigate to private page
  // should not redirect
  act(() => navigate(routes.private()))
  await waitFor(() => {
    expect(screen.getByText(/Authenticating.../)).toBeInTheDocument()
    expect(screen.queryByText(/Home Page/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Private Page/)).not.toBeInTheDocument()
  })
  await waitFor(() => {
    expect(screen.getByText(/Still authenticating.../)).toBeInTheDocument()
    expect(screen.queryByText(/Home Page/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Private Page/)).not.toBeInTheDocument()
  })
})

test('inits routes two private routes with a space in between and loads as expected', async () => {
  const TestRouter = () => (
    <Router>
      <Route path="/" page={HomePage} name="home" />
      <Route path="/about" page={AboutPage} name="about" />
      <Route path="/redirect" page={RedirectPage} name="redirect" />
      <PrivateSet unauthenticated="home">
        <Route path="/private" page={PrivatePage} name="private" />{' '}
        <Route path="/another-private" page={PrivatePage} name="private" />
      </PrivateSet>

      <Route
        path="/param-test/:value"
        page={({ value }: { value: string }) => <div>param {value}</div>}
        name="params"
      />
    </Router>
  )
  const screen = render(<TestRouter />)

  // starts on home page
  await waitFor(() => screen.getByText(/Home Page/i))
})

test('supports <Set>', async () => {
  const GlobalLayout = ({ children }: LayoutProps) => (
    <div>
      <h1>Global Layout</h1>
      {children}
    </div>
  )

  const TestRouter = () => (
    <Router>
      <Set wrap={GlobalLayout}>
        <Route path="/" page={HomePage} name="home" />
        <Route path="/about" page={AboutPage} name="about" />
        <Route path="/redirect" page={RedirectPage} name="redirect" />
        <PrivateSet unauthenticated="home">
          <Route path="/private" page={PrivatePage} name="private" />
          <Route
            path="/another-private"
            page={PrivatePage}
            name="anotherPrivate"
          />
        </PrivateSet>
      </Set>
    </Router>
  )
  const screen = render(<TestRouter />)

  await waitFor(() => screen.getByText(/Global Layout/i))
  await waitFor(() => screen.getByText(/Home Page/i))
})

test('can use named routes for navigating', async () => {
  const MainLayout = ({ children }: LayoutProps) => {
    return (
      <div>
        <h1>Main Layout</h1>
        <Link to={routes.home()}>Home-link</Link>
        <Link to={routes.about()}>About-link</Link>
        <hr />
        {children}
      </div>
    )
  }

  const TestRouter = () => (
    <Router>
      <Set wrap={MainLayout}>
        <Route path="/" page={HomePage} name="home" />
        <Route path="/about" page={AboutPage} name="about" />
      </Set>
    </Router>
  )

  const screen = render(<TestRouter />)

  // starts on home page, with MainLayout
  await waitFor(() => screen.getByText(/Home Page/))
  await waitFor(() => screen.getByText(/Main Layout/))

  fireEvent.click(screen.getByText('About-link'))
  await waitFor(() => screen.getByText(/About Page/))
})

test('renders only active path', async () => {
  const AboutLayout = ({ children }: LayoutProps) => {
    return (
      <div>
        <h1>About Layout</h1>
        <hr />
        {children}
      </div>
    )
  }

  const LoginLayout = ({ children }: LayoutProps) => {
    return (
      <div>
        <h1>Login Layout</h1>
        <hr />
        {children}
      </div>
    )
  }

  const TestRouter = () => (
    <Router>
      <Route path="/" page={HomePage} name="home" />
      <Set wrap={AboutLayout}>
        <Route path="/about" page={AboutPage} name="about" />
      </Set>
      <Set wrap={LoginLayout}>
        <Route path="/login" page={LoginPage} name="login" />
      </Set>
    </Router>
  )

  const screen = render(<TestRouter />)

  // starts on home page, with no layout
  await waitFor(() => screen.getByText(/Home Page/))
  expect(screen.queryByText('About Layout')).not.toBeInTheDocument()
  expect(screen.queryByText('Login Layout')).not.toBeInTheDocument()

  // go to about page, with only about layout
  act(() => navigate(routes.about()))
  await waitFor(() => screen.getByText(/About Page/))
  expect(screen.queryByText('About Layout')).toBeInTheDocument()
  expect(screen.queryByText('Login Layout')).not.toBeInTheDocument()

  // go to login page, with only login layout
  act(() => navigate(routes.login()))
  await waitFor(() => screen.getByText(/Login Page/))
  expect(screen.queryByText('About Layout')).not.toBeInTheDocument()
  expect(screen.queryByText('Login Layout')).toBeInTheDocument()
})

test('renders first matching route only', async () => {
  const ParamPage = ({ param }: { param: string }) => <div>param {param}</div>

  const TestRouter = () => (
    <Router>
      <Route path="/" page={HomePage} name="home" />
      <Route path="/about" page={AboutPage} name="about" />
      <Route path="/{param}" page={ParamPage} name="param" />
    </Router>
  )

  const screen = render(<TestRouter />)

  await waitFor(() => screen.getByText(/Home Page/))

  // go to about page, and make sure that's the only page rendered
  act(() => navigate(routes.about()))

  await waitFor(() => screen.getByText('About Page'))
  expect(screen.queryByText(/param/)).not.toBeInTheDocument()
})

test('renders first matching route only, even if multiple routes have the same name', async () => {
  const ParamPage = ({ param }: { param: string }) => <div>param {param}</div>
  const AboutTwoPage = () => <h1>About Two Page</h1>

  const TestRouter = () => (
    <Router>
      <Route path="/" page={HomePage} name="home" />
      <Route path="/about" page={AboutPage} name="about" />
      <Route path="/{param}" page={ParamPage} name="about" />
      <Route path="/about" page={AboutTwoPage} name="about" />
      <Route path="/about" page={AboutPage} name="about" />
    </Router>
  )

  const screen = render(<TestRouter />)

  await waitFor(() => screen.getByText(/Home Page/))

  // go to about page, and make sure that's the only page rendered
  act(() => navigate(routes.about()))
  // `getByText` will throw an error if more than one node is found
  // which is perfect, because that's exactly what we want to test
  await waitFor(() => screen.getByText('About Page'))
  expect(screen.queryByText('param')).not.toBeInTheDocument()
  expect(screen.queryByText('About Two Page')).not.toBeInTheDocument()
})

test('renders first matching route only, also with PrivateSet', async () => {
  const ParamPage = ({ param }: { param: string }) => <div>param {param}</div>

  const TestRouter = () => (
    <Router>
      <Route path="/" page={HomePage} name="home" />
      <Route path="/login" page={LoginPage} name="login" />
      <Route path="/about" page={AboutPage} name="about" />
      <PrivateSet unauthenticated="login">
        <Route path="/{param}" page={ParamPage} name="param" />
      </PrivateSet>
    </Router>
  )

  const screen = render(<TestRouter />)

  await waitFor(() => screen.getByText(/Home Page/))

  // go to about page, and make sure that's the only page rendered
  act(() => navigate(routes.about()))
  await waitFor(() => screen.getByText('About Page'))
  expect(screen.queryByText(/param/)).not.toBeInTheDocument()
})

test('renders first matching route only, also with param path outside PrivateSet', async () => {
  const ParamPage = ({ param }: { param: string }) => <div>param {param}</div>

  const TestRouter = () => (
    <Router useAuth={mockUseAuth({ isAuthenticated: true })}>
      <Route path="/" page={HomePage} name="home" />
      <PrivateSet unauthenticated="login">
        <Route path="/private" page={PrivatePage} name="private" />
      </PrivateSet>
      <Route path="/{param}" page={ParamPage} name="param" />
    </Router>
  )

  const screen = render(<TestRouter />)

  await waitFor(() => screen.getByText(/Home Page/))

  // go to about page, and make sure that's the only page rendered
  act(() => navigate(routes.private()))
  await waitFor(() => screen.getByText('Private Page'))
  expect(screen.queryByText(/param/)).not.toBeInTheDocument()
})

test('params should never be an empty object', async () => {
  const ParamPage = () => {
    const params = useParams()
    expect(params).not.toEqual({})
    return null
  }

  const TestRouter = () => (
    <Router>
      <Route path="/test/{documentId}" page={ParamPage} name="param" />
    </Router>
  )

  act(() => navigate('/test/1'))
  render(<TestRouter />)
})

test('params should never be an empty object in Set', async () => {
  const ParamPage = () => {
    return <div>Param Page</div>
  }

  const SetWithUseParams = ({ children }: LayoutProps) => {
    const params = useParams()
    expect(params).not.toEqual({})
    return <>{children}</>
  }

  const TestRouter = () => (
    <Router>
      <Set wrap={SetWithUseParams}>
        <Route path="/test/{documentId}" page={ParamPage} name="param" />
      </Set>
    </Router>
  )

  act(() => navigate('/test/1'))
  const screen = render(<TestRouter />)
  await waitFor(() => screen.getByText('Param Page'))
})

test('params should never be an empty object in Set with waitFor (I)', async () => {
  const ParamPage = () => {
    const { documentId } = useParams()
    return <>documentId: {documentId}</>
  }

  const SetWithUseParams = ({ children }: LayoutProps) => {
    const params = useParams()
    // 1st run: { documentId: '1' }
    // 2nd run: { documentId: '2' }
    expect(params).not.toEqual({})
    return <>{children}</>
  }

  const TestRouter = () => (
    <Router>
      <Set wrap={SetWithUseParams}>
        <Route path="/test/{documentId}" page={ParamPage} name="param" />
      </Set>
      <Route path="/" page={() => <Redirect to="/test/2" />} name="home" />
    </Router>
  )

  act(() => navigate('/test/1'))
  const screen = render(<TestRouter />)
  await waitFor(() => screen.getByText(/documentId: 1/))
  act(() => navigate('/'))
  await waitFor(() => screen.getByText(/documentId: 2/))
})

test('params should never be an empty object in Set without waitFor (II)', async () => {
  const ParamPage = () => {
    const { documentId } = useParams()
    return <>documentId: {documentId}</>
  }

  const SetWithUseParams = ({ children }: LayoutProps) => {
    const params = useParams()
    // 1st run: { documentId: '1' }
    // 2nd run: { documentId: '2' }
    expect(params).not.toEqual({})
    return <>{children}</>
  }

  const TestRouter = () => (
    <Router>
      <Set wrap={SetWithUseParams}>
        <Route path="/test/{documentId}" page={ParamPage} name="param" />
      </Set>
      <Route path="/" page={() => <Redirect to="/test/2" />} name="home" />
    </Router>
  )

  act(() => navigate('/test/1'))
  const screen = render(<TestRouter />)
  act(() => navigate('/'))
  await waitFor(() => screen.getByText(/documentId: 2/))
})

test('Set is not rendered for unauthenticated user.', async () => {
  const ParamPage = () => {
    // This should never be called. We should be redirected to login instead.
    expect(false).toBe(true)
    return null
  }

  const SetWithUseParams = ({ children }: LayoutProps) => {
    // This should never be called. We should be redirected to login instead.
    expect(false).toBe(true)
    return <>{children}</>
  }

  const TestRouter = () => (
    <Router>
      <PrivateSet wrap={SetWithUseParams} unauthenticated="login">
        <Route path="/test/{documentId}" page={ParamPage} name="param" />
      </PrivateSet>
      <Route path="/" page={HomePage} name="home" />
      <Route path="/login" page={() => <div>auth thyself</div>} name="login" />
    </Router>
  )

  // Go to home page and start loading
  // Wait until it has loaded
  // Go to /test/1 and start loading
  // Get redirected to /login
  const screen = render(<TestRouter />)
  await waitFor(() => screen.getByText('Home Page'))
  act(() => navigate('/test/1'))
  await waitFor(() => screen.getByText(/auth thyself/))
})

test('Set is not rendered for unauthenticated user on direct navigation', async () => {
  const ParamPage = () => {
    // This should never be called. We should be redirected to login instead.
    expect(false).toBe(true)
    return null
  }

  const SetWithUseParams = ({ children }: LayoutProps) => {
    // This should never be called. We should be redirected to login instead.
    expect(false).toBe(true)
    return <>{children}</>
  }

  const TestRouter = () => (
    <Router>
      {/* Keeping this around so we don't accidentally break the `private` prop
      on Set until we're ready to remove it */}
      <Set private wrap={SetWithUseParams} unauthenticated="login">
        <Route path="/test/{documentId}" page={ParamPage} name="param" />
      </Set>
      <Route path="/" page={HomePage} name="home" />
      <Route path="/login" page={() => <div>auth thyself</div>} name="login" />
    </Router>
  )

  act(() => navigate('/test/1'))
  const screen = render(<TestRouter />)
  await waitFor(() => screen.getByText(/auth thyself/))
})

// TODO: Remove this entire test once we remove the `<Private>` component
test('Private is an alias for Set private', async () => {
  interface PrivateLayoutProps {
    children: React.ReactNode
    theme: string
  }

  const PrivateLayout = ({ children, theme }: PrivateLayoutProps) => (
    <div>
      <h1>Private Layout ({theme})</h1>
      {children}
    </div>
  )

  const TestRouter = () => (
    <Router useAuth={mockUseAuth({ isAuthenticated: true })}>
      <Route path="/" page={HomePage} name="home" />
      <Private<PrivateLayoutProps>
        wrap={PrivateLayout}
        unauthenticated="home"
        theme="dark"
      >
        <Route path="/private" page={PrivatePage} name="private" />
      </Private>
    </Router>
  )
  const screen = render(<TestRouter />)

  await waitFor(() => screen.getByText(/Home Page/i))

  act(() => navigate('/private'))
  await waitFor(() => screen.getByText(/Private Layout \(dark\)/))
  await waitFor(() => screen.getByText(/Private Page/))
})

test('redirect to last page', async () => {
  const TestRouter = () => (
    <Router>
      <Route path="/" page={HomePage} name="home" />
      <Route path="/about" page={AboutPage} name="about" />
      <PrivateSet unauthenticated="login">
        <Route path="/private" page={PrivatePage} name="private" />
      </PrivateSet>
      <Route path="/login" page={LoginPage} name="login" />
    </Router>
  )
  const screen = render(<TestRouter />)

  // starts on home page
  await waitFor(() => screen.getByText(/Home Page/i))

  // navigate to private page
  // should redirect to login
  act(() => navigate(routes.private()))

  await waitFor(() => {
    expect(screen.queryByText(/Private Page/i)).not.toBeInTheDocument()
    screen.getByText('Login Page')
    expect(window.location.pathname).toBe('/login')
    expect(window.location.search).toBe('?redirectTo=/private')
  })
})

test('no location match means nothing is rendered', async () => {
  const TestRouter = () => (
    <Router>
      <Route path="/" page={HomePage} name="home" />
    </Router>
  )
  const screen = render(<TestRouter />)

  // starts on home page
  await waitFor(() => screen.getByText(/Home Page/i))

  // navigate page that doesn't exist
  act(() => navigate('/not/found'))

  // wait for rendering
  // Otherwise adding a NotFound route still makes this test pass
  await new Promise((r) => setTimeout(r, 200))

  expect(screen.container).toMatchInlineSnapshot('<div />')
})

test('jump to new route, then go back', async () => {
  const HelpPage = () => <h1>Help Page</h1>
  const TestRouter = () => (
    <Router>
      <Route path="/" page={HomePage} name="home" />
      <Route path="/login" page={LoginPage} name="login" />
      <Route path="/about" page={AboutPage} name="about" />
      <Route path="/help" page={HelpPage} name="help" />
    </Router>
  )
  const screen = render(<TestRouter />)

  // starts on home page
  await waitFor(() => screen.getByText('Home Page'))

  act(() => navigate(routes.about()))
  await waitFor(() => screen.getByText('About Page'))
  act(() => navigate(routes.help(), { replace: true }))
  await waitFor(() => screen.getByText('Help Page'))
  act(() => back())
  await waitFor(() => screen.getByText('Home Page'))
})

test('redirect replacing route', async () => {
  const ListWithDefaultParamsPage = (props: { _limit: string }) => {
    if (props['_limit']) {
      return <h1>List Page</h1>
    }
    return <Redirect to="/list?_limit=10" options={{ replace: true }} />
  }
  const TestRouter = () => (
    <Router>
      <Route path="/" page={HomePage} name="home" />
      <Route path="/list" page={ListWithDefaultParamsPage} name="list" />
    </Router>
  )
  const screen = render(<TestRouter />)

  // starts on home page
  await waitFor(() => screen.getByText('Home Page'))

  // This will navigate to /list, which will then redirect to /list?_limit=10
  // which will render `<h1>List Page</h1>`
  act(() => navigate(routes.list()))
  await waitFor(() => screen.getByText('List Page'))
  act(() => back())
  // without options.replace = true in Redirect, back would go to List Page
  await waitFor(() => screen.getByText('Home Page'))
})

describe('trailing slashes', () => {
  const TSNeverRouter = () => (
    <Router trailingSlashes="never">
      <Route path="/" page={HomePage} name="home" />
      <Route path="/about" page={AboutPage} name="about" />
      <Route notfound page={NotFoundPage} />
    </Router>
  )
  const getTSNeverScreen = () => render(<TSNeverRouter />)

  test('starts on home page', async () => {
    const screen = getTSNeverScreen()
    await waitFor(() => screen.getByText(/Home Page/i))
  })

  test('strips trailing slash on navigating to about page', async () => {
    const screen = getTSNeverScreen()
    act(() => navigate('/about/'))
    await waitFor(() => screen.getByText(/About Page/i))
  })

  const TSAlwaysRouter = () => (
    <Router trailingSlashes="always">
      <Route path="/" page={HomePage} name="home" />
      <Route path="/about/" page={AboutPage} name="about" />
      <Route notfound page={NotFoundPage} />
    </Router>
  )
  const getTSAlwaysScreen = () => render(<TSAlwaysRouter />)

  test('starts on home page', async () => {
    const screen = getTSAlwaysScreen()
    await waitFor(() => screen.getByText(/Home Page/i))
  })

  test('adds trailing slash on navigating to about page', async () => {
    const screen = getTSAlwaysScreen()
    act(() => navigate('/about'))
    await waitFor(() => screen.getByText(/About Page/i))
  })

  const TSPreserveRouter = () => (
    <Router trailingSlashes="preserve">
      <Route path="/" page={HomePage} name="home" />
      <Route path="/about" page={AboutPage} name="about" />
      <Route path="/contact/" page={() => <h1>Contact Page</h1>} name="about" />
      <Route notfound page={NotFoundPage} />
    </Router>
  )
  const getTSPreserveScreen = () => render(<TSPreserveRouter />)

  test('starts on home page', async () => {
    const screen = getTSPreserveScreen()
    await waitFor(() => screen.getByText(/Home Page/i))
  })

  test('navigates to about page as is', async () => {
    const screen = getTSPreserveScreen()
    act(() => navigate('/about'))
    await waitFor(() => screen.getByText(/About Page/i))
  })

  test('navigates to contact page as is', async () => {
    const screen = getTSPreserveScreen()
    act(() => navigate('/contact/'))
    await waitFor(() => screen.getByText(/Contact Page/i))
  })
})

test('params should be updated if navigated to different route with same page', async () => {
  const UserPage = ({ id }: { id?: number }) => {
    const { id: idFromContext } = useParams()
    return (
      <>
        <p>param {id ? id : 'no-id'}</p>
        <p>hookparams {idFromContext ? idFromContext : 'no-param-id'} </p>
      </>
    )
  }
  const TestRouter = () => (
    <Router>
      <Route path="/user" page={UserPage} name="allUsers" />
      <Route path="/user/{id:Int}" page={UserPage} name="user" />
    </Router>
  )

  const screen = render(<TestRouter />)
  act(() => navigate('/user'))
  // Wait for page load
  await waitFor(() => screen.getByText('param no-id'))
  act(() => navigate('/user/99'))

  await waitFor(() => {
    expect(screen.queryByText('param 99')).toBeInTheDocument()
    expect(screen.queryByText('hookparams 99')).toBeInTheDocument()
  })
})

test('should handle ref and key as search params', async () => {
  const ParamsPage = () => {
    const { ref, key } = useParams()
    return <p>{JSON.stringify({ ref, key })}</p>
  }

  const TestRouter = () => (
    <Router>
      <Route path="/params" page={ParamsPage} name="params" />
    </Router>
  )

  const screen = render(<TestRouter />)
  act(() => navigate('/params?ref=1&key=2'))

  await waitFor(() => {
    expect(screen.queryByText(`{"ref":"1","key":"2"}`)).toBeInTheDocument()
  })
})

describe('Unauthorized redirect error messages', () => {
  let err: typeof console.error

  beforeAll(() => {
    err = console.error
    console.error = vi.fn()
  })

  afterAll(() => {
    console.error = err
  })

  test('PrivateSet with unauthenticated prop with nonexisting page', async () => {
    const TestRouter = ({ authenticated }: { authenticated?: boolean }) => (
      <Router useAuth={mockUseAuth({ isAuthenticated: authenticated })}>
        <Route path="/" page={HomePage} name="home" />
        <PrivateSet unauthenticated="does-not-exist">
          <Route path="/private" page={PrivatePage} name="private" />
        </PrivateSet>
      </Router>
    )

    act(() => navigate('/private'))
    expect(() => render(<TestRouter authenticated={false} />)).toThrow(
      'We could not find a route named does-not-exist',
    )
  })

  test('PrivateSet redirecting to page that needs parameters', async () => {
    const TestRouter = ({ authenticated }: { authenticated?: boolean }) => (
      <Router useAuth={mockUseAuth({ isAuthenticated: authenticated })}>
        <Route path="/" page={HomePage} name="home" />
        <Route path="/param-test/{value}" page={ParamPage} name="params" />
        <PrivateSet unauthenticated="params">
          <Route path="/private" page={PrivatePage} name="private" />
        </PrivateSet>
      </Router>
    )

    act(() => navigate('/private'))
    expect(() => render(<TestRouter authenticated={false} />)).toThrow(
      'Redirecting to route "params" would require route parameters, which ' +
        'currently is not supported. Please choose a different route',
    )
  })
})

describe('Multiple nested private sets', () => {
  const HomePage = () => <h1>Home Page</h1>
  const PrivateNoRolesAssigned = () => <h1>Private No Roles Page</h1>
  const PrivateEmployeePage = () => <h1>Private Employee Page</h1>
  const PrivateAdminPage = () => <h1>Private Admin Page</h1>

  interface LevelLayoutProps {
    children: React.ReactNode
    level: string
  }

  const LevelLayout = ({ children, level }: LevelLayoutProps) => (
    <div>
      Level: {level}
      {children}
    </div>
  )

  const TestRouter = ({ useAuthMock }: { useAuthMock: UseAuth }) => (
    <Router useAuth={useAuthMock}>
      <Route path="/" page={HomePage} name="home" />
      <PrivateSet<LevelLayoutProps>
        unauthenticated="home"
        level="1"
        wrap={LevelLayout}
      >
        <Route
          path="/no-roles-assigned"
          page={PrivateNoRolesAssigned}
          name="noRolesAssigned"
        />
        <PrivateSet
          unauthenticated="noRolesAssigned"
          roles={['ADMIN', 'EMPLOYEE']}
        >
          <PrivateSet unauthenticated="privateAdmin" roles={['EMPLOYEE']}>
            <Route
              path="/employee"
              page={PrivateEmployeePage}
              name="privateEmployee"
            />
          </PrivateSet>

          <PrivateSet unauthenticated="privateEmployee" roles={['ADMIN']}>
            <Route path="/admin" page={PrivateAdminPage} name="privateAdmin" />
          </PrivateSet>
        </PrivateSet>
      </PrivateSet>
    </Router>
  )

  test('is authenticated but does not have matching roles', async () => {
    const screen = render(
      <TestRouter
        useAuthMock={mockUseAuth({
          isAuthenticated: true,
          hasRole: false,
        })}
      />,
    )

    act(() => navigate('/employee'))

    await waitFor(() => {
      expect(screen.queryByText(`Private No Roles Page`)).toBeInTheDocument()
      expect(screen.queryByText(`Level: 1`)).toBeInTheDocument()
    })
  })

  test('is not authenticated', async () => {
    const screen = render(
      <TestRouter
        useAuthMock={mockUseAuth({
          isAuthenticated: false,
          hasRole: false,
        })}
      />,
    )

    act(() => navigate('/employee'))

    await waitFor(() => {
      expect(screen.queryByText(`Home Page`)).toBeInTheDocument()
      expect(screen.queryByText(`Level`)).not.toBeInTheDocument()
    })
  })

  test('is authenticated and has a matching role', async () => {
    const screen = render(
      <TestRouter
        useAuthMock={mockUseAuth({
          isAuthenticated: true,
          hasRole: (role) => {
            return role.includes('ADMIN')
          },
        })}
      />,
    )

    act(() => navigate('/admin'))
    await waitFor(() => {
      expect(screen.queryByText(`Private Admin Page`)).toBeInTheDocument()
    })
  })

  test('returns the correct page if has a matching role', async () => {
    const screen = render(
      <TestRouter
        useAuthMock={mockUseAuth({
          isAuthenticated: true,
          hasRole: (role) => {
            return role.includes('ADMIN')
          },
        })}
      />,
    )

    act(() => navigate('/admin'))

    await waitFor(() => {
      expect(screen.queryByText(`Private Admin Page`)).toBeInTheDocument()
    })
  })
})

describe('Multiple nested sets', () => {
  const HomePage = () => <h1>Home Page</h1>
  const Page = () => <h1>Page</h1>

  interface DebugLayoutProps {
    children: React.ReactNode
    theme: string
    otherProp?: string
    level: string
  }

  const DebugLayout = (props: DebugLayoutProps) => {
    return (
      <div>
        <p>Theme: {props.theme}</p>
        <p>Other Prop: {props.otherProp}</p>
        <p>Page Level: {props.level}</p>
        {props.children}
      </div>
    )
  }

  const TestRouter = () => (
    <Router>
      <Route path="/" page={HomePage} name="home" />
      <Set<DebugLayoutProps> level="1" theme="blue" wrap={DebugLayout}>
        <Route path="/level1" page={Page} name="level1" />
        <Set level="2" theme="red" otherProp="bazinga">
          <Route path="/level2" page={Page} name="level2" />
          <Set level="3" theme="green">
            <Route path="/level3" page={Page} name="level3" />
          </Set>
        </Set>
      </Set>
    </Router>
  )

  test('level 1, matches expected props', async () => {
    act(() => navigate('/level1'))

    const screen = render(<TestRouter />)

    await waitFor(() => {
      expect(screen.queryByText('Theme: blue')).toBeInTheDocument()
      expect(screen.queryByText('Other Prop:')).toBeInTheDocument()
      expect(screen.queryByText('Page Level: 1')).toBeInTheDocument()
    })
  })

  test('level 2, should not affect level 1 set props', async () => {
    act(() => navigate('/level2'))

    const screen = render(<TestRouter />)

    await waitFor(() => {
      expect(screen.queryByText('Page')).toBeInTheDocument()
      expect(screen.queryByText('Theme: blue')).toBeInTheDocument()
      expect(screen.queryByText('Other Prop:')).toBeInTheDocument()
      expect(screen.queryByText('Page Level: 1')).toBeInTheDocument()
    })
  })

  test('level 3, should override level 1 & 2 and pass through other props', async () => {
    const screen = render(<TestRouter />)

    act(() => navigate('/level3'))

    await waitFor(() => {
      expect(screen.queryByText('Theme: blue')).toBeInTheDocument()
      expect(screen.queryByText('Other Prop:')).toBeInTheDocument()
      expect(screen.queryByText('Page Level: 1')).toBeInTheDocument()
    })
  })
})
