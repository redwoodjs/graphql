import type { ReactNode, ReactElement } from 'react'
import { isValidElement } from 'react'

import type {
  InternalRouteProps,
  NotFoundRouteProps,
  RedirectRouteProps,
  RouteProps,
} from './Route.js'
import { Route } from './Route.js'

function isNodeTypeRoute(
  node: ReactNode,
): node is ReactElement<InternalRouteProps> {
  return isValidElement(node) && node.type === Route
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

/**
 * Narrows down the type of the Route element to RouteProps
 *
 * It means that it is not a notfound page or a redirected route
 */
export function isStandardRoute(
  node: ReactElement<InternalRouteProps>,
): node is ReactElement<RouteProps> {
  return !node.props.notfound && !node.props.redirect
}

/** Checks if a Route element is a Redirect Route */
export function isRedirectRoute(
  node: ReactElement<InternalRouteProps>,
): node is ReactElement<RedirectRouteProps> {
  return !!node.props.redirect
}

/** Checks if a Route element is a NotFound Route */
export function isNotFoundRoute(
  node: ReactElement<InternalRouteProps>,
): node is ReactElement<NotFoundRouteProps> {
  return !!node.props.notfound
}

/**
 * Check that the Route element is ok
 * and that it could be one of the following:
 * <Route redirect .../>  (redirect Route)
 * <Route notfound .../>  (notfound Route)
 * <Route .../> (standard Route)
 */
export function isValidRoute(
  node: ReactNode,
): node is ReactElement<InternalRouteProps> {
  const isValidRouteElement = isNodeTypeRoute(node)

  if (isValidRouteElement) {
    const notFoundOrRedirect = node.props.notfound || node.props.redirect
    const requiredKeys = [
      !node.props.notfound && 'path',
      // redirects don't need an actual page, but notfound and standard do
      !node.props.redirect && 'page',
      // Redirects can have names, but aren't required to
      !notFoundOrRedirect && 'name',
    ].filter(isString)

    const missingKeys = requiredKeys.filter((key) => !(key in node.props))

    if (missingKeys.length > 0) {
      const stringToHelpIdentify =
        node.props.name || node.props.path
          ? `for "${node.props.name || node.props.path}" `
          : ''
      // Throw inside here, because we know it's a Route otherwise it could be
      // a Set or Private
      throw new Error(
        `Route element ${stringToHelpIdentify}is missing required props: ` +
          missingKeys.join(', '),
      )
    }
  }

  return isValidRouteElement
}
