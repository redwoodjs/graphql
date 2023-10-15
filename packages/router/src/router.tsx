import type { ReactNode, ReactElement } from 'react'
import React, { useMemo, memo } from 'react'

import { ActiveRouteLoader } from './active-route-loader'
import { AuthenticatedRoute } from './AuthenticatedRoute'
import { Redirect } from './links'
import { LocationProvider, useLocation } from './location'
import { PageLoadingContextProvider } from './PageLoadingContext'
import { ParamsProvider } from './params'
import type {
  NotFoundRouteProps,
  RedirectRouteProps,
  RenderMode,
} from './route-validators'
import { isValidRoute, PageType } from './route-validators'
import type { RouterContextProviderProps } from './router-context'
import { RouterContextProvider } from './router-context'
import { SplashPage } from './splash-page'
import {
  analyzeRoutes,
  matchPath,
  normalizePage,
  parseSearch,
  replaceParams,
  validatePath,
} from './util'
import type { Wrappers, TrailingSlashesTypes } from './util'

import type { AvailableRoutes } from './index'

// namedRoutes is populated at run-time by iterating over the `<Route />`
// components, and appending them to this object.
// Has to be `const`, or there'll be a race condition with imports in users'
// projects
const namedRoutes: AvailableRoutes = {}

export interface RouteProps {
  path: string
  page: PageType
  name: string
  prerender?: boolean
  renderMode?: RenderMode
  whileLoadingPage?: () => ReactElement | null
}

/**
 *
 * Route is now a "virtual" component
 * it is actually never rendered. All the page loading logic happens in active-route-loader
 * and all the validation happens within utility functions called from the Router
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
    pathRouteMap,
    hasHomeRoute,
    namedRoutesMap,
    NotFoundPage,
    activeRoutePath,
  } = useMemo(() => {
    return analyzeRoutes(children, {
      currentPathName: location.pathname,
      // @TODO We haven't handled this with SSR/Streaming yet.
      // May need a babel plugin to extract userParamTypes from Routes.tsx
      userParamTypes: paramTypes,
    })
  }, [location.pathname, children, paramTypes])

  // Assign namedRoutes so it can be imported like import {routes} from 'rwjs/router'
  // Note that the value changes at runtime
  Object.assign(namedRoutes, namedRoutesMap)

  // The user has not generated routes if the only route that exists is the
  // not found page, and that page is not part of the namedRoutes object
  const hasGeneratedRoutes = Object.keys(namedRoutes).length > 0

  const shouldShowSplash =
    (!hasHomeRoute && location.pathname === '/') || !hasGeneratedRoutes

  if (shouldShowSplash && typeof SplashPage !== 'undefined') {
    return (
      <SplashPage
        hasGeneratedRoutes={hasGeneratedRoutes}
        allStandardRoutes={pathRouteMap}
      />
    )
  }

  // Render 404 page if no route matches
  if (!activeRoutePath) {
    if (NotFoundPage) {
      return (
        <RouterContextProvider useAuth={useAuth} paramTypes={paramTypes}>
          <ParamsProvider>
            <PageLoadingContextProvider delay={pageLoadingDelay}>
              <ActiveRouteLoader
                spec={normalizePage(NotFoundPage)}
                path={location.pathname}
              />
            </PageLoadingContextProvider>
          </ParamsProvider>
        </RouterContextProvider>
      )
    }

    return null
  }

  const {
    path,
    page,
    name,
    redirect,
    whileLoadingPage,
    wrappers = [],
    setProps,
    isPrivate,
    setId,
  } = pathRouteMap[activeRoutePath]

  if (!path) {
    throw new Error(`Route "${name}" needs to specify a path`)
  }

  // Check for issues with the path.
  validatePath(path, name || path)

  const { params: pathParams } = matchPath(path, location.pathname, {
    userParamTypes: paramTypes,
  })

  const searchParams = parseSearch(location.search)
  const allParams = { ...searchParams, ...pathParams }

  // Level 2/3 (LocationAwareRouter)
  return (
    <RouterContextProvider useAuth={useAuth} paramTypes={paramTypes}>
      <ParamsProvider allParams={allParams}>
        <PageLoadingContextProvider delay={pageLoadingDelay}>
          {redirect && <Redirect to={replaceParams(redirect, allParams)} />}
          {!redirect && page && (
            <WrappedPage
              key={setId}
              wrappers={wrappers}
              routeLoaderElement={
                <ActiveRouteLoader
                  path={path}
                  spec={normalizePage(page as any)}
                  params={allParams}
                  whileLoadingPage={whileLoadingPage as any}
                />
              }
              setProps={setProps}
              isPrivate={isPrivate}
            />
          )}
        </PageLoadingContextProvider>
      </ParamsProvider>
    </RouterContextProvider>
  )
}

interface WrappedPageProps {
  wrappers: Wrappers
  routeLoaderElement: ReactNode
  setProps: Record<string, any>[]
  isPrivate?: boolean
}

/**
 * This is effectively a Set (without auth-related code)
 *
 * This means that the <Set> and <PrivateSet> components become "virtual"
 * i.e. they are never actually Rendered, but their props are extracted by the
 * analyze routes function.
 *
 * This is so that we can have all the information up front in the routes-manifest
 * for SSR, but also so that we only do one loop of all the Routes.
 */
const WrappedPage = memo(
  ({ wrappers, routeLoaderElement, setProps, isPrivate }: WrappedPageProps) => {
    // @NOTE: don't mutate the wrappers array, it causes full page re-renders
    // Instead just create a new array with the AuthenticatedRoute wrapper

    // we need to pass the setProps from each set to each wrapper
    let wrappersWithAuthMaybe = wrappers

    // @MARK note the reverse() here, because we spread wrappersWithAuthMaybe
    ;[...setProps].reverse().forEach((propsFromSet) => {
      if (isPrivate) {
        if (!propsFromSet.unauthenticated) {
          throw new Error(
            'You must specify an `unauthenticated` route when using PrivateSet'
          )
        }

        // @MARK: this component intentionally removes all props except children
        // because the .reduce below will apply props inside out
        const AuthComponent: React.FC<{ children: ReactNode }> = ({
          children,
        }) => {
          return (
            <AuthenticatedRoute
              {...propsFromSet}
              unauthenticated={propsFromSet.unauthenticated}
            >
              {children}
            </AuthenticatedRoute>
          )
        }

        wrappersWithAuthMaybe = [AuthComponent, ...wrappersWithAuthMaybe]
      }
    })

    if (wrappersWithAuthMaybe.length > 0) {
      // If wrappers exist e.g. [a,b,c] -> <a><b><c><routeLoader></c></b></a> and returns a single ReactNode
      // Wrap AuthenticatedRoute this way, because if we mutate the wrappers array itself
      // it causes full rerenders of the page
      return wrappersWithAuthMaybe.reduceRight<ReactNode | undefined>(
        (acc, wrapper) => {
          // Merge props from set, the lowest set props will override the higher ones
          const mergedSetProps = setProps.reduce((acc, props) => {
            return { ...acc, ...props }
          }, {})

          return React.createElement(
            wrapper,
            mergedSetProps,
            acc ? acc : routeLoaderElement
          )
        },
        undefined
      )
    }

    return routeLoaderElement
  }
)

export {
  Router,
  Route,
  namedRoutes as routes,
  isValidRoute as isRoute,
  PageType,
}
