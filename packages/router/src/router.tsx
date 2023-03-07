import React, { ReactNode, ReactElement, useMemo } from 'react'

import { ActiveRouteLoader } from './active-route-loader'
import { Redirect } from './links'
import { LocationProvider, useLocation } from './location'
import { ParamsProvider } from './params'
import {
  isValidRoute,
  NotFoundRouteProps,
  PageType,
  RedirectRouteProps,
} from './route-validators'
import {
  RouterContextProvider,
  RouterContextProviderProps,
} from './router-context'
import { SplashPage } from './splash-page'
import {
  analyzeRoutes,
  matchPath,
  normalizePage,
  parseSearch,
  replaceParams,
  TrailingSlashesTypes,
  validatePath,
} from './util'

import type { AvailableRoutes } from './index'

// namedRoutes is populated at run-time by iterating over the `<Route />`
// components, and appending them to this object.
let namedRoutes: AvailableRoutes = {}

export interface RouteProps {
  path: string
  page: PageType
  name: string
  prerender?: boolean
  whileLoadingPage?: () => ReactElement | null
}

/**
 *
 * Route is now a "virtual" component
 * it is actually never rendered. All the page loading logic happens in active-route-loader
 * and all the validation happens within utlity functions called from the Router
 */
function Route(props: RouteProps): JSX.Element
function Route(props: RedirectRouteProps): JSX.Element
function Route(props: NotFoundRouteProps): JSX.Element
function Route(_props: RouteProps | RedirectRouteProps | NotFoundRouteProps) {
  return <></>
}

export interface RouterProps extends RouterContextProviderProps {
  trailingSlashes?: TrailingSlashesTypes
  pageLoadingDelay?: number
  children: ReactNode
}

const Router: React.FC<RouterProps> = ({
  useAuth,
  paramTypes,
  pageLoadingDelay,
  trailingSlashes = 'never',
  children,
}) => {
  return (
    // Level 1/3 (outer-most)
    // Wrap it in the provider so that useLocation can be used
    <LocationProvider trailingSlashes={trailingSlashes}>
      <LocationAwareRouter
        useAuth={useAuth}
        paramTypes={paramTypes}
        pageLoadingDelay={pageLoadingDelay}
      >
        {children}
      </LocationAwareRouter>
    </LocationProvider>
  )
}

const LocationAwareRouter: React.FC<RouterProps> = ({
  useAuth,
  paramTypes,
  pageLoadingDelay,
  children,
}) => {
  const location = useLocation()

  const {
    namePathMap,
    hasHomeRoute,
    namedRoutesMap,
    NotFoundPage,
    activeRouteName,
  } = useMemo(
    () =>
      analyzeRoutes(children, {
        currentPathName: location.pathname,
        userParamTypes: paramTypes,
      }),
    [location.pathname, children, paramTypes]
  )

  // Assign namedRoutes so it can be imported like import {routes} from 'rwjs/router'
  // Note that the value changes at runtime
  namedRoutes = namedRoutesMap

  // The user has not generated routes
  // if the only route that exists is
  // is the not found page
  const hasGeneratedRoutes = Object.keys(namedRoutes).length > 0

  const shouldShowSplash =
    (!hasHomeRoute && location.pathname === '/') || !hasGeneratedRoutes

  if (shouldShowSplash && typeof SplashPage !== 'undefined') {
    return (
      <SplashPage
        hasGeneratedRoutes={hasGeneratedRoutes}
        allStandardRoutes={namePathMap}
      />
    )
  }

  // Render 404 page if no route matches
  if (!activeRouteName) {
    if (NotFoundPage) {
      return (
        <RouterContextProvider useAuth={useAuth} paramTypes={paramTypes}>
          <ParamsProvider>
            <ActiveRouteLoader
              spec={normalizePage(NotFoundPage)}
              delay={pageLoadingDelay}
              path={location.pathname}
            />
          </ParamsProvider>
        </RouterContextProvider>
      )
    }

    return null
  }

  const { path, page, name, redirect, whileLoadingPage } =
    namePathMap[activeRouteName]

  if (!path) {
    throw new Error(`Route "${name}" needs to specify a path`)
  }

  // Check for issues with the path.
  validatePath(path, name)

  const { params: pathParams } = matchPath(path, location.pathname, {
    userParamTypes: paramTypes,
  })

  const searchParams = parseSearch(location.search)
  const allParams = { ...searchParams, ...pathParams }

  // Level 2/3 (LocationAwareRouter)
  return (
    <RouterContextProvider useAuth={useAuth} paramTypes={paramTypes}>
      <ParamsProvider allParams={allParams}>
        {redirect && <Redirect to={replaceParams(redirect, allParams)} />}
        {!redirect && page && (
          <ActiveRouteLoader
            path={path}
            spec={normalizePage(page)}
            delay={pageLoadingDelay}
            params={allParams}
            whileLoadingPage={whileLoadingPage}
          />
        )}
      </ParamsProvider>
    </RouterContextProvider>
  )
}

export {
  Router,
  Route,
  namedRoutes as routes,
  isValidRoute as isRoute,
  PageType,
}
