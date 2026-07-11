// This is Redwood's routing mechanism. It takes inspiration from both Ruby on
// Rails' routing approach and from both React Router and Reach Router (the
// latter of which has closely inspired some of this code).

export { navigate, back } from './history.js'
export { NavLink } from './navLink.js'
export { Link } from './link.js'
export { useLocation, LocationProvider } from './location.js'
export { Redirect } from './redirect.js'
export {
  usePageLoadingContext,
  PageLoadingContextProvider,
} from './PageLoadingContext.js'
export { useParams, ParamsProvider, ParamsContext } from './params.js'
export { Router } from './router.js'
export { Route } from './Route.js'
export { namedRoutes as routes } from './namedRoutes.js'

export * from './Set.js'

export { default as RouteAnnouncement } from './route-announcement.js'
export * from './route-announcement.js'
export { default as RouteFocus } from './route-focus.js'
export * from './route-focus.js'
export * from './useRouteName.js'
export * from './useRoutePaths.js'
export * from './useMatch.js'
export * from './useBlocker.js'

export { parseSearch, getRouteRegexAndParams, matchPath } from './util.js'

export { SkipNavLink, SkipNavContent } from './skipNav.js'

/**
 * A more specific interface is created in `.redwood/types/includes/web-routerRoutes`
 * when the site is built, which will describe all known routes.
 *
 * @example
 * interface AvailableRoutes {
 *   home: (params?: RouteParams<"/">) => "/"
 *   post: (params?: RouteParams<"/posts/{id:Int}">) => "/posts/{id:Int}"
 * }
 */
// Keep this in index.ts so it can be extended with declaration merging
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface AvailableRoutes {}

// Used by packages/internal/src/generate/templates/web-routerRoutes.d.ts.template
export * from './routeParamsTypes.js'

// TODO(jgmw): Remove this comment it's to kick CI into gear
