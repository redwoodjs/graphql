import React, { isValidElement } from 'react'

import { describe, test, expect } from 'vitest'

import { analyzeRoutes } from '../analyzeRoutes.js'
import { Route } from '../Route.js'
import { Router } from '../router.js'
import { Private, PrivateSet, Set } from '../Set.js'

const FakePage = () => <h1>Fake Page</h1>

interface LayoutProps {
  children: React.ReactNode
}

const FakeLayout1 = ({ children }: LayoutProps) => (
  <div className="layout1">{children}</div>
)

const FakeLayout2 = ({ children }: LayoutProps) => (
  <div className="layout2">{children}</div>
)

const FakeLayout3 = ({ children }: LayoutProps) => (
  <div className="layout2">{children}</div>
)

describe('AnalyzeRoutes: with homePage and Children', () => {
  const CheckRoutes = (
    <Router>
      <Route path="/hello" name="hello" page={FakePage} />
      <Route path="/world" name="world" page={FakePage} />
      <Route path="/recipe/{id}" name="recipeById" page={FakePage} />
      <Route path="/" name="home" page={FakePage} />
      <Route notfound page={FakePage} />
    </Router>
  )

  const { pathRouteMap, namedRoutesMap, hasRootRoute, NotFoundPage } =
    analyzeRoutes(CheckRoutes.props.children, {
      currentPathName: '/',
    })

  test('Should return namePathMap and hasRootRoute correctly', () => {
    expect(Object.keys(pathRouteMap)).toEqual([
      '/hello',
      '/world',
      '/recipe/{id}',
      '/',
    ])

    expect(pathRouteMap['/hello']).toEqual(
      expect.objectContaining({
        name: 'hello',
        page: FakePage,
        path: '/hello',
      }),
    )

    expect(pathRouteMap['/world']).toEqual(
      expect.objectContaining({
        name: 'world',
        page: FakePage,
        path: '/world',
      }),
    )

    // @NOTE the path here is the path DEFINITION, not that actual path
    expect(pathRouteMap['/recipe/{id}']).toEqual(
      expect.objectContaining({
        name: 'recipeById',
        page: FakePage,
        path: '/recipe/{id}',
      }),
    )

    expect(hasRootRoute).toBe(true)
  })

  test('Should return namedRoutesMap correctly', () => {
    expect(namedRoutesMap.home()).toEqual('/')
    expect(namedRoutesMap.world()).toEqual('/world')
    expect(namedRoutesMap.hello({ queryGuy: 1 })).toEqual('/hello?queryGuy=1')
    expect(namedRoutesMap.recipeById({ id: 55 })).toEqual('/recipe/55')
  })

  test('Should return the notFoundPage', () => {
    expect(NotFoundPage).toBeDefined()

    // @ts-expect-error We know its a valid element
    // We know that FakePage is an React component, and not a Spec
    expect(isValidElement(NotFoundPage())).toBe(true)
  })

  test('Should return the active Route by name', () => {
    const { activeRoutePath } = analyzeRoutes(CheckRoutes.props.children, {
      currentPathName: '/recipe/512512',
    })
    expect(activeRoutePath).toBeDefined()
    expect(activeRoutePath).toBe('/recipe/{id}')
  })
})

describe('setWrapper', () => {
  interface WrapperXProps {
    children: React.ReactNode
    id: string
    passThruProp: string
  }

  const WrapperX = ({ children }: WrapperXProps) => (
    <>
      <h1>WrapperX</h1>
      {children}
    </>
  )

  interface WrapperYProps {
    children: React.ReactNode
    id: string
    theme: string
  }

  const WrapperY = ({ children }: WrapperYProps) => (
    <>
      <h1>WrapperY</h1>
      {children}
    </>
  )

  const Simple = (
    <Router>
      <Set wrap={[WrapperX]} id="set-one" passThruProp="bazinga">
        <Route path="/a" name="routeA" page={FakePage} />
        <Set wrap={[WrapperY]} id="set-two" theme="blue">
          <Route name="routeB" path="/b" page={FakePage} />
          <Route name="routeC" path="/c" page={FakePage} />
        </Set>
      </Set>
    </Router>
  )

  const { pathRouteMap } = analyzeRoutes(Simple.props.children, {
    currentPathName: '/',
  })

  test('Creates setWrapper map', () => {
    expect(pathRouteMap['/a']).toEqual(
      expect.objectContaining({
        redirect: null,
        name: 'routeA',
        path: '/a',
        whileLoadingPage: undefined,
        sets: [
          {
            id: '1',
            wrappers: [WrapperX],
            isPrivate: false,
            props: {
              id: 'set-one',
              passThruProp: 'bazinga',
            },
          },
        ],
      }),
    )

    expect(pathRouteMap['/b']).toEqual(
      expect.objectContaining({
        redirect: null,
        name: 'routeB',
        path: '/b',
        whileLoadingPage: undefined,
        sets: [
          {
            id: '1',
            wrappers: [WrapperX],
            isPrivate: false,
            props: {
              id: 'set-one',
              passThruProp: 'bazinga',
            },
          },
          {
            id: '1.1',
            isPrivate: false,
            wrappers: [WrapperY],
            props: {
              id: 'set-two',
              theme: 'blue',
            },
          },
        ],
      }),
    )

    expect(pathRouteMap['/c']).toEqual(
      expect.objectContaining({
        redirect: null,
        name: 'routeC',
        path: '/c',
        whileLoadingPage: undefined,
        sets: [
          {
            id: '1',
            wrappers: [WrapperX],
            isPrivate: false,
            props: {
              id: 'set-one',
              passThruProp: 'bazinga',
            },
          },
          {
            id: '1.1',
            wrappers: [WrapperY],
            isPrivate: false,
            props: {
              id: 'set-two',
              theme: 'blue',
            },
          },
        ],
      }),
    )
  })

  test('Connects Set wrapper props with correct Set', () => {
    expect(pathRouteMap['/a']).toEqual(
      expect.objectContaining({
        redirect: null,
        name: 'routeA',
        path: '/a',
        whileLoadingPage: undefined,
        sets: [
          {
            id: '1',
            wrappers: [WrapperX],
            isPrivate: false,
            props: {
              id: 'set-one',
              passThruProp: 'bazinga',
            },
          },
        ],
      }),
    )

    expect(pathRouteMap['/b']).toEqual(
      expect.objectContaining({
        redirect: null,
        name: 'routeB',
        path: '/b',
        whileLoadingPage: undefined,
        sets: [
          {
            id: '1',
            wrappers: [WrapperX],
            isPrivate: false,
            props: {
              id: 'set-one',
              passThruProp: 'bazinga',
            },
          },
          {
            id: '1.1',
            wrappers: [WrapperY],
            isPrivate: false,
            props: {
              id: 'set-two',
              theme: 'blue',
            },
          },
        ],
      }),
    )

    expect(pathRouteMap['/c']).toEqual(
      expect.objectContaining({
        redirect: null,
        name: 'routeC',
        path: '/c',
        whileLoadingPage: undefined,
        sets: [
          {
            id: '1',
            wrappers: [WrapperX],
            isPrivate: false,
            props: {
              id: 'set-one',
              passThruProp: 'bazinga',
            },
          },
          {
            id: '1.1',
            wrappers: [WrapperY],
            isPrivate: false,
            props: {
              id: 'set-two',
              theme: 'blue',
            },
          },
        ],
      }),
    )
  })

  test('Creates setWrapper map with nested sets', () => {
    const KrismasTree = (
      <PrivateSet unauthenticated="signIn">
        <Route path="/dashboard" page={FakePage} name="dashboard" />
        <Set wrap={[FakeLayout1, FakeLayout2]}>
          <Route
            path="/{org}/settings/general"
            page={FakePage}
            name="settingsGeneral"
          />
          <Route
            path="/{org}/settings/api"
            page={FakePage}
            name="settingsAPI"
          />
          <Route
            path="/{org}/settings/twitter"
            page={FakePage}
            name="settingsTwitter"
          />
        </Set>
        <Set wrap={FakeLayout1}>
          <Set wrap={[FakeLayout2, FakeLayout3]}>
            <Route path="/{org}/series" page={FakePage} name="series" />
            <Route path="/{org}" page={FakePage} name="organization" />
            <Route
              path="/account/reset-password"
              page={FakePage}
              name="resetPassword"
              prerender
            />
          </Set>
          <Set wrap={FakeLayout2}>
            <Route
              path="/{org}/events/{eventCode}/edit"
              page={FakePage}
              name="editEvent"
            />
            <Route
              path="/{org}/events/{eventCode}/players"
              page={FakePage}
              name="eventPlayers"
            />
            <Route
              path="/{org}/events/{eventCode}/analytics"
              page={FakePage}
              name="eventAnalytics"
            />
            <Route
              path="/{org}/events/{eventCode}/scores"
              page={FakePage}
              name="eventScores"
            />
            <Route
              path="/{org}/events/{eventCode}/tweets"
              page={FakePage}
              name="eventTweets"
            />
          </Set>
        </Set>
      </PrivateSet>
    )

    const { pathRouteMap } = analyzeRoutes(KrismasTree.props.children, {
      currentPathName: '/bazingaOrg/events/kittenCode/edit',
    })

    expect(Object.keys(pathRouteMap).length).toBe(12)

    // @TODO finish writing the expectations
  })
})

test('No root Route', () => {
  const CheckRoutes = (
    <Router>
      <Route path="/home" name="home" page={FakePage} />
      <Route path="/away" name="away" page={FakePage} />
    </Router>
  )

  const { pathRouteMap, namedRoutesMap, hasRootRoute } = analyzeRoutes(
    CheckRoutes.props.children,
    {
      currentPathName: '/',
    },
  )

  expect(Object.keys(namedRoutesMap).length).toEqual(2)
  expect(Object.keys(pathRouteMap).length).toEqual(2)
  expect(hasRootRoute).toBe(false)
})

test('Root Route named "root"', () => {
  const CheckRoutes = (
    <Router>
      <Route path="/" name="root" page={FakePage} />
    </Router>
  )

  const { pathRouteMap, namedRoutesMap, hasRootRoute } = analyzeRoutes(
    CheckRoutes.props.children,
    {
      currentPathName: '/',
    },
  )

  expect(Object.keys(namedRoutesMap).length).toEqual(1)
  expect(Object.keys(pathRouteMap).length).toEqual(1)
  expect(hasRootRoute).toBe(true)
})

test('Root Route named "home"', () => {
  const CheckRoutes = (
    <Router>
      <Route path="/" name="home" page={FakePage} />
    </Router>
  )

  const { pathRouteMap, namedRoutesMap, hasRootRoute } = analyzeRoutes(
    CheckRoutes.props.children,
    {
      currentPathName: '/',
    },
  )

  expect(Object.keys(namedRoutesMap).length).toEqual(1)
  expect(Object.keys(pathRouteMap).length).toEqual(1)
  expect(hasRootRoute).toBe(true)
})

test('Handles Private', () => {
  const Routes = (
    <Router>
      <Route path="/" name="home" page={FakePage} />
      <Private unauthenticated="home">
        <Route path="/private" name="privateRoute" page={FakePage} />
      </Private>
    </Router>
  )

  const { pathRouteMap } = analyzeRoutes(Routes.props.children, {
    currentPathName: '/',
  })

  expect(pathRouteMap['/private']).toStrictEqual({
    redirect: null,
    name: 'privateRoute',
    path: '/private',
    whileLoadingPage: undefined,
    page: FakePage,
    sets: [
      {
        id: '1',
        wrappers: [],
        isPrivate: true,
        props: { unauthenticated: 'home' },
      },
    ],
  })
})

test('Handles PrivateSet', () => {
  const Routes = (
    <Router>
      <Route path="/" name="home" page={FakePage} />
      <PrivateSet unauthenticated="home">
        <Route path="/private" name="privateRoute" page={FakePage} />
      </PrivateSet>
    </Router>
  )

  const { pathRouteMap } = analyzeRoutes(Routes.props.children, {
    currentPathName: '/',
  })

  expect(pathRouteMap['/private']).toStrictEqual({
    redirect: null,
    name: 'privateRoute',
    path: '/private',
    whileLoadingPage: undefined,
    page: FakePage,
    sets: [
      {
        id: '1',
        wrappers: [],
        isPrivate: true,
        props: { unauthenticated: 'home' },
      },
    ],
  })
})

test('Redirect routes analysis', () => {
  const RedirectedRoutes = (
    <Router>
      <Route path="/simple" redirect="/rdSimple" name="simple" />
      <Route
        path="/rdSimple"
        name="rdSimple"
        page={() => <h1>Redirected page</h1>}
      />
    </Router>
  )

  const { pathRouteMap, namedRoutesMap } = analyzeRoutes(
    RedirectedRoutes.props.children,
    {
      currentPathName: '/simple',
    },
  )

  expect(pathRouteMap['/simple'].redirect).toBe('/rdSimple')
  expect(pathRouteMap['/rdSimple'].redirect).toBeFalsy()

  expect(Object.keys(namedRoutesMap).length).toBe(2)
  expect(namedRoutesMap.simple()).toBe('/simple')
  expect(namedRoutesMap.rdSimple()).toBe('/rdSimple')
})

test('Nested sets, and authentication logic', () => {
  const PrivateAdminPage = () => <h1>Private Admin Page</h1>
  const PrivateEmployeePage = () => <h1>Private Employee Page</h1>
  const PrivateNoRolesAssigned = () => <h1>Private Employee Page</h1>

  const RedirectedRoutes = (
    <Router>
      <Route path="/" page={FakePage} name="home" />
      <PrivateSet unauthenticated="home">
        <Route
          path="/no-roles-assigned"
          page={PrivateNoRolesAssigned}
          name="noRolesAssigned"
        />
        <Set
          private
          unauthenticated="noRolesAssigned"
          roles={['ADMIN', 'EMPLOYEE']}
          someProp="propFromNoRolesSet"
        >
          <PrivateSet unauthenticated="admin" roles={'EMPLOYEE'}>
            <Route
              path="/employee"
              page={PrivateEmployeePage}
              name="privateEmployee"
            />
          </PrivateSet>

          <PrivateSet unauthenticated="employee" roles={'ADMIN'}>
            <Route path="/admin" page={PrivateAdminPage} name="privateAdmin" />
          </PrivateSet>
        </Set>
      </PrivateSet>
    </Router>
  )

  const { pathRouteMap, namedRoutesMap } = analyzeRoutes(
    RedirectedRoutes.props.children,
    {
      currentPathName: '/does-not-exist',
    },
  )

  // Level 1: wrapped with private
  expect(pathRouteMap).toMatchObject({
    '/no-roles-assigned': {
      redirect: null,
      sets: [
        {
          id: '1',
          isPrivate: true,
          props: { unauthenticated: 'home' },
        },
      ],
    },
  })

  expect(Object.keys(namedRoutesMap).length).toBe(4)

  // Level 2: wrapped in 2 private sets
  expect(pathRouteMap).toMatchObject({
    '/employee': {
      redirect: null,
      sets: [
        {
          id: '1',
          wrappers: [],
          isPrivate: true,
          props: { unauthenticated: 'home' },
        },
        {
          id: '1.1',
          wrappers: [],
          isPrivate: true,
          props: expect.objectContaining({
            unauthenticated: 'noRolesAssigned',
            roles: ['ADMIN', 'EMPLOYEE'],
          }),
        },
        {
          id: '1.1.1',
          wrappers: [],
          isPrivate: true,
          props: {
            unauthenticated: 'admin',
            roles: 'EMPLOYEE',
          },
        },
      ],
    },
  })

  // Level 3: wrapped in 3 private sets
  expect(pathRouteMap).toMatchObject({
    '/admin': {
      redirect: null,
      sets: [
        // Should have the first one, but also..
        {
          id: '1',
          wrappers: [],
          isPrivate: true,
          props: { unauthenticated: 'home' },
        },
        // ...the second private set's props
        {
          id: '1.1',
          wrappers: [],
          isPrivate: true,
          props: {
            unauthenticated: 'noRolesAssigned',
            roles: ['ADMIN', 'EMPLOYEE'],
          },
        },
        // ...and the third private set's props
        {
          id: '1.1.2',
          wrappers: [],
          isPrivate: true,
          props: {
            unauthenticated: 'employee',
            roles: 'ADMIN',
          },
        },
      ],
    },
  })
})

test('Give correct ids to root sets', () => {
  const Layout = ({ children }: LayoutProps) => <>{children}</>

  const Routes = (
    <Router>
      <Route path="/" page={FakePage} name="home" />
      <Set wrap={Layout}>
        <Route path="/one" page={FakePage} name="one" />
      </Set>
      <Set wrap={Layout}>
        <Route path="/two" page={FakePage} name="two" />
      </Set>
    </Router>
  )

  const { pathRouteMap } = analyzeRoutes(Routes.props.children, {
    currentPathName: '/',
  })

  expect(pathRouteMap).toMatchObject({
    '/': {
      redirect: null,
      sets: [],
    },
    '/one': {
      redirect: null,
      sets: [
        {
          id: '1',
          wrappers: [Layout],
          isPrivate: false,
        },
      ],
    },
    '/two': {
      redirect: null,
      sets: [
        {
          id: '2',
          wrappers: [Layout],
          isPrivate: false,
        },
      ],
    },
  })
})
