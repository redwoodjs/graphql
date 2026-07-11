import { useLocation } from './location.js'
import { matchPath } from './util.js'
import type { FlattenSearchParams } from './util.js'

type UseMatchOptions = {
  routeParams?: Record<string, any>
  searchParams?: FlattenSearchParams
  matchSubPaths?: boolean
}

/**
 * Returns an object of { match: boolean; params: Record<string, unknown>; }
 * If the path matches the current location `match` will be true.
 * Params will be an object of the matched params, if there are any.
 *
 * Provide routeParams options to match specific route param values
 * Provide searchParams options to match the current location.search
 *
 * This is useful for components that need to know "active" state, e.g.
 * <NavLink>.
 *
 * Examples:
 *
 * Match search params key existence
 * const match = useMatch('/about', { searchParams: ['category', 'page'] })
 *
 * Match search params key and value
 * const match = useMatch('/items', { searchParams: [{page: 2}, {category: 'book'}] })
 *
 * Mix match
 * const match = useMatch('/list', { searchParams: [{page: 2}, 'gtm'] })
 *
 * Match sub paths
 * const match = useMatch('/product', { matchSubPaths: true })
 *
 * Match only specific route param values
 * const match = useMatch('/product/{category}/{id}', { routeParams: { category: 'shirts' } })
 */
export const useMatch = (routePath: string, options?: UseMatchOptions) => {
  const location = useLocation()
  if (!location) {
    return { match: false }
  }

  if (options?.searchParams) {
    const locationParams = new URLSearchParams(location.search)
    const hasUnmatched = options.searchParams.some((param) => {
      if (typeof param === 'string') {
        return !locationParams.has(param)
      } else {
        return Object.keys(param).some(
          (key) => param[key] != locationParams.get(key),
        )
      }
    })

    if (hasUnmatched) {
      return { match: false }
    }
  }

  const matchInfo = matchPath(routePath, location.pathname, {
    matchSubPaths: options?.matchSubPaths,
  })

  if (!matchInfo.match) {
    return { match: false }
  }

  const routeParams = Object.entries(options?.routeParams || {})

  if (routeParams.length > 0) {
    if (!isMatchWithParams(matchInfo) || !matchInfo.params) {
      return { match: false }
    }

    // If paramValues were given, they must all match
    const isParamMatch = routeParams.every(([key, value]) => {
      return matchInfo.params[key] === value
    })

    if (!isParamMatch) {
      return { match: false }
    }
  }

  return matchInfo
}

function isMatchWithParams(match: unknown): match is { params: any } {
  return match !== null && typeof match === 'object' && 'params' in match
}
