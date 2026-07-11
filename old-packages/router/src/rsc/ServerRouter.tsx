import type { ReactNode } from 'react'
import React from 'react'

import { getAuthState, getLocation } from '@redwoodjs/server-store'

import { analyzeRoutes } from '../analyzeRoutes.js'
import type { Wrappers } from '../analyzeRoutes.js'
import { namedRoutes } from '../namedRoutes.js'
import { normalizePage } from '../page.js'
import type { RouterContextProviderProps } from '../router-context.js'
import { SplashPage } from '../splash-page.js'
import type { TrailingSlashesTypes } from '../util.js'
import { matchPath, parseSearch, replaceParams, validatePath } from '../util.js'

import { ServerRouteLoader } from './ServerRouteLoader.js'

export interface RouterProps
  extends Omit<RouterContextProviderProps, 'routes' | 'activeRouteName'> {
  trailingSlashes?: TrailingSlashesTypes
  pageLoadingDelay?: number
  children: ReactNode
}

export const Router: React.FC<RouterProps> = ({ paramTypes, children }) => {
  const location = getLocation()

  console.log('ServerRouter.tsx location', location)

  const analyzedRoutes = analyzeRoutes(children, {
    currentPathName: location.pathname,
    // @TODO We haven't handled this with SSR/Streaming yet.
    // May need a babel plugin to extract userParamTypes from Routes.tsx
    userParamTypes: paramTypes,
  })

  const {
    pathRouteMap,
    hasRootRoute,
    namedRoutesMap,
    NotFoundPage,
    activeRoutePath,
  } = analyzedRoutes

  // Assign namedRoutes so it can be imported like import {routes} from 'rwjs/router'
  // Note that the value changes at runtime
  Object.assign(namedRoutes, namedRoutesMap)

  // The user has not generated routes if the only route that exists is the
  // not found page, and that page is not part of the namedRoutes object
  const hasGeneratedRoutes = Object.keys(namedRoutes).length > 0

  const shouldShowSplash =
    (!hasRootRoute && location.pathname === '/') || !hasGeneratedRoutes

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
        <ServerRouteLoader
          spec={normalizePage(NotFoundPage)}
          path={location.pathname}
        />
      )
    }

    return null
  }

  const { path, page, name, redirect, whileLoadingPage, sets } =
    pathRouteMap[activeRoutePath]

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

  let redirectPath: string | undefined = undefined

  if (redirect) {
    if (redirect.startsWith('/')) {
      redirectPath = replaceParams(redirect, allParams)
    } else {
      const redirectRouteObject = Object.values(pathRouteMap).find(
        (route) => route.name === redirect,
      )

      if (!redirectRouteObject) {
        throw new Error(
          `Redirect target route "${redirect}" does not exist for route "${name}"`,
        )
      }

      redirectPath = replaceParams(redirectRouteObject.path, allParams)
    }
  }

  return (
    <>
      {!redirectPath && page && (
        <WrappedPage
          sets={sets}
          routeLoaderElement={
            <ServerRouteLoader
              path={path}
              spec={normalizePage(page)}
              params={allParams}
              whileLoadingPage={whileLoadingPage}
            />
          }
        />
      )}
    </>
  )
}

// TODO (RSC): We allow users to implement their own `hasRole` function in
// `api/src/lib/auth.ts`. We should use that instead of implementing our own
// here. Should we just import it from there? Or should we allow users to
// pass it to us instead somehow?
function hasRole(requiredRoles: string | string[]): boolean {
  const { roles } = getAuthState()

  const requiredRolesArray = Array.isArray(requiredRoles)
    ? requiredRoles
    : [requiredRoles]

  return requiredRolesArray.some((role) => roles.includes(role))
}

interface AuthenticatedRouteProps {
  children: React.ReactNode
  roles?: string | string[]
  unauthenticated: string
  whileLoadingAuth?: () => React.ReactElement | null
}

const AuthenticatedRoute: React.FC<AuthenticatedRouteProps> = ({
  children,
  roles,
}) => {
  const { isAuthenticated } = getAuthState()

  const isAuthorized = isAuthenticated && (!roles || hasRole(roles))

  if (isAuthorized) {
    return <>{children}</>
  }

  // TODO (RSC): Where do we catch this error? How do we handle it?
  if (!isAuthenticated) {
    throw new Error('401 Unauthorized')
  }

  // User is authenticated but not authorized because they don't have the
  // required role(s)
  throw new Error('403 Forbidden')
}

interface WrappedPageProps {
  routeLoaderElement: ReactNode
  sets: {
    id: string
    wrappers: Wrappers
    isPrivate: boolean
    props: {
      private?: boolean
      [key: string]: unknown
    }
  }[]
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
const WrappedPage = ({ routeLoaderElement, sets }: WrappedPageProps) => {
  // @NOTE: don't mutate the wrappers array, it causes full page re-renders
  // Instead just create a new array with the AuthenticatedRoute wrapper

  if (!sets || sets.length === 0) {
    return routeLoaderElement
  }

  return sets.reduceRight<ReactNode | undefined>((acc, set) => {
    // For each set in `sets`, if you have `<Set wrap={[a,b,c]} p="p" />` then
    // this will return
    // <a p="p"><b p="p"><c p="p"><routeLoaderElement /></c></b></a>
    // If you have `<PrivateSet wrap={[a,b,c]} p="p" />` instead it will return
    // <AuthenticatedRoute>
    //   <a p="p"><b p="p"><c p="p"><routeLoaderElement /></c></b></a>
    // </AuthenticatedRoute>

    // Bundle up all the wrappers into a single element with each wrapper as a
    // child of the previous (that's why we do reduceRight)
    let wrapped = set.wrappers.reduceRight((acc, Wrapper, index) => {
      return React.createElement(
        Wrapper,
        { ...set.props, key: set.id + '-' + index },
        acc,
      )
    }, acc)

    // If set is private, wrap it in AuthenticatedRoute
    if (set.isPrivate) {
      const unauthenticated = set.props.unauthenticated
      if (!unauthenticated || typeof unauthenticated !== 'string') {
        throw new Error(
          'You must specify an `unauthenticated` route when using PrivateSet',
        )
      }

      // We do this last, to make sure that none of the wrapper elements are
      // rendered if the user isn't authenticated
      wrapped = (
        <AuthenticatedRoute {...set.props} unauthenticated={unauthenticated}>
          {wrapped}
        </AuthenticatedRoute>
      )
    }

    return wrapped
  }, routeLoaderElement)
}
