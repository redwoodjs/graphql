// This is Redwood's routing mechanism. It takes inspiration from both Ruby on
// Rails' routing approach and from both React Router and Reach Router (the
// latter of which has closely inspired some of this code).

export {
  Router,
  Route,
  Link,
  NavLink,
  useMatch,
  Redirect,
  routes,
  useParams,
  useLocation,
  LocationProvider,
  PageLoadingContext,
} from './internal'

export * from './Set'

export { usePageLoadingContext } from './page-loader'

export { default as RouteAnnouncement } from './route-announcement'
export * from './route-announcement'
export { default as RouteFocus } from './route-focus'
export * from './route-focus'

/**
 * A more specific interface will be generated by
 * babel-plugin-redwood-routes-auto-loader when a redwood project is built
 *
 * @example
 * interface AvailableRoutes {
 *   home: (params?: RouteParams<"/">) => "/"
 *   post: (params?: RouteParams<"/posts/{id:Int}">) => "/posts/{id:Int}"
 * }
 */
// Keep this in index.ts so it can be extended with declaration merging
export interface AvailableRoutes {
  [key: string]: (
    args?: Record<string | number, string | number | boolean>
  ) => string
}

export { SkipNavLink, SkipNavContent } from '@reach/skip-nav'

export { navigate, jump, back } from '@redwoodjs/history'
