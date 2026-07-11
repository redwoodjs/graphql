// These are utils that can be shared between both server- and client components

/**
 * Get param name, type, and match for a route.
 *
 *  '/blog/{year}/{month}/{day:Int}/{filePath...}'
 *   => [
 *        ['year',     'String', '{year}'],
 *        ['month',    'String', '{month}'],
 *        ['day',      'Int',    '{day:Int}'],
 *        ['filePath', 'Glob',   '{filePath...}']
 *      ]
 *
 * Only exported to be able to test it
 */
export function paramsForRoute(route: string) {
  // Match the strings between `{` and `}`.
  const params = [...route.matchAll(/\{([^}]+)\}/g)]

  return params
    .map((match) => match[1])
    .map((match) => {
      const parts = match.split(':')

      // Normalize the name
      let name = parts[0]
      if (name.endsWith('...')) {
        // Globs have their ellipsis removed
        name = name.slice(0, -3)
      }

      // Determine the type
      let type = parts[1]
      if (!type) {
        // Strings and Globs are implicit in the syntax
        type = match.endsWith('...') ? 'Glob' : 'String'
      }

      return [name, type, `{${match}}`]
    })
}

export type TrailingSlashesTypes = 'never' | 'always' | 'preserve'

export interface ParamType {
  match?: RegExp
  parse?: (value: any) => unknown
}

/** Definitions of the core param types. */
const coreParamTypes: Record<string, ParamType> = {
  String: {
    match: /[^/]+/,
  },
  Int: {
    match: /\d+/,
    parse: Number,
  },
  Float: {
    match: /[-+]?(?:\d*\.?\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/,
    parse: Number,
  },
  Boolean: {
    match: /true|false/,
    parse: (boolAsString: string) => boolAsString === 'true',
  },
  Glob: {
    match: /.*/,
  },
}

/**
 * Determine if the given route is a match for the given pathname. If so,
 * extract any named params and return them in an object.
 *
 * route         - The route path as specified in the <Route path={...} />
 * pathname      - The pathname from the window.location.
 * paramTypes    - The object containing all param type definitions.
 * matchSubPaths - Also match sub routes
 *
 * Examples:
 *
 *  matchPath('/blog/{year}/{month}/{day}', '/blog/2019/12/07')
 *  => { match: true, params: { year: '2019', month: '12', day: '07' }}
 *
 *  matchPath('/about', '/')
 *  => { match: false }
 *
 *  matchPath('/post/{id:Int}', '/post/7')
 *  => { match: true, params: { id: 7 }}
 *
 *  matchPath('/post/1', '/post/', { matchSubPaths: true })
 *  => { match: true, params: {} }
 */
export function matchPath(
  routeDefinition: string,
  pathname: string,
  {
    userParamTypes,
    matchSubPaths,
  }: {
    userParamTypes?: Record<string, ParamType>
    matchSubPaths?: boolean
  } = {
    userParamTypes: {},
    matchSubPaths: false,
  },
) {
  // Get the names and the transform types for the given route.
  const allParamTypes = { ...coreParamTypes, ...userParamTypes }

  const { matchRegex, routeParams: routeParamsDefinition } =
    getRouteRegexAndParams(routeDefinition, {
      matchSubPaths,
      allParamTypes,
    })

  // Does the `pathname` match the route?
  const matches = [...pathname.matchAll(matchRegex)]

  if (matches.length === 0) {
    return { match: false }
  }
  // Map extracted values to their param name, casting the value if needed
  const providedParams = matches[0].slice(1)

  // @NOTE: refers to definition e.g. '/page/{id}', not the actual params
  if (routeParamsDefinition.length > 0) {
    const params = providedParams.reduce<Record<string, unknown>>(
      (acc, value, index) => {
        const [name, transformName] = routeParamsDefinition[index]
        const typeInfo = allParamTypes[transformName]

        let transformedValue: string | unknown = value
        if (typeof typeInfo?.parse === 'function') {
          transformedValue = typeInfo.parse(value)
        }

        return {
          ...acc,
          [name]: transformedValue,
        }
      },
      {},
    )
    return { match: true, params }
  }

  return { match: true }
}

interface GetRouteRegexOptions {
  matchSubPaths?: boolean
  allParamTypes?: Record<string, ParamType> // Pass in paramTypes to match, if user has custom param types
}
/**
 *  This function will return a regex for each route path i.e. /blog/{year}/{month}/{day}
 *  will return a regex like /blog/([^/$1*]+)/([^/$1*]+)/([^/$1*]+)
 *
 * @returns
 */

export function getRouteRegexAndParams(
  route: string,
  {
    matchSubPaths = false,
    allParamTypes = coreParamTypes,
  }: GetRouteRegexOptions | undefined = {},
) {
  let typeMatchingRoute = route
  const routeParams = paramsForRoute(route)

  // Map all params from the route to their type `match` regexp to create a
  // "type-matching route" regexp
  // /recipe/{id} -> /recipe/([^/$1*]+)
  for (const [_name, type, match] of routeParams) {
    // `undefined` matcher if `type` is not supported
    const matcher = allParamTypes[type]?.match

    // Get the regex as a string, or default regexp if `match` is not specified
    const typeRegexp = matcher?.source || '[^/]+'

    typeMatchingRoute = typeMatchingRoute.replace(match, `(${typeRegexp})`)
  }

  const matchRegex = matchSubPaths
    ? new RegExp(`^${typeMatchingRoute}(?:/.*)?$`, 'g')
    : new RegExp(`^${typeMatchingRoute}$`, 'g')

  const matchRegexString = matchSubPaths
    ? `^${typeMatchingRoute}(?:/.*)?$`
    : `^${typeMatchingRoute}$`

  return {
    matchRegex,
    routeParams,
    matchRegexString,
  }
}

/**
 * Parse the given search string into key/value pairs and return them in an
 * object.
 *
 * Examples:
 *
 *  parseSearch('?key1=val1&key2=val2')
 *  => { key1: 'val1', key2: 'val2' }
 *
 * @fixme
 * This utility ignores keys with multiple values such as `?foo=1&foo=2`.
 */
export function parseSearch(
  search:
    | string
    | string[][]
    | Record<string, string>
    | URLSearchParams
    | undefined,
) {
  const searchParams = new URLSearchParams(search)

  return [...searchParams.keys()].reduce(
    (params, key) => ({
      ...params,
      [key]: searchParams.get(key),
    }),
    {},
  )
}

/**
 * Validate a path to make sure it follows the router's rules. If any problems
 * are found, a descriptive Error will be thrown, as problems with routes are
 * critical enough to be considered fatal.
 */
export function validatePath(path: string, routeName: string) {
  // Check that path begins with a slash.
  if (!path.startsWith('/')) {
    throw new Error(
      `Route path for ${routeName} does not begin with a slash: "${path}"`,
    )
  }

  if (path.includes(' ')) {
    throw new Error(`Route path for ${routeName} contains spaces: "${path}"`)
  }

  if (/{(?:ref|key)(?::|})/.test(path)) {
    throw new Error(
      [
        `Route for ${routeName} contains ref or key as a path parameter: "${path}"`,
        "`ref` and `key` shouldn't be used as path parameters because they're special React props.",
        'You can fix this by renaming the path parameter.',
      ].join('\n'),
    )
  }

  // Guard the following regex matching
  if (path.length > 2000) {
    throw new Error(
      `Route path for ${routeName} is too long to process at ${path.length} characters, limit is 2000 characters.`,
    )
  }

  // Check for duplicate named params.
  const matches = path.matchAll(/\{([^}]+)\}/g)
  const memo: Record<string, boolean> = {}
  for (const match of matches) {
    // Extract the param's name to make sure there aren't any duplicates
    const param = match[1].split(':')[0]
    if (memo[param]) {
      throw new Error(`Route path contains duplicate parameter: "${path}"`)
    } else {
      memo[param] = true
    }
  }
}

/**
 * Take a given route path and replace any named parameters with those in the
 * given args object. Any extra params not used in the path will be appended
 * as key=value pairs in the search part.
 *
 * Examples:
 *
 *   replaceParams('/tags/{tag}', { tag: 'code', extra: 'foo' })
 *   => '/tags/code?extra=foo
 */
export function replaceParams(
  route: string,
  args: Record<string, unknown> = {},
) {
  const params = paramsForRoute(route)
  let path = route

  // Replace all params in the route with their values
  params.forEach((param) => {
    const [name, _type, match] = param
    const value = args[name]
    if (value !== undefined) {
      path = path.replace(match, value as string)
    } else {
      throw new Error(
        `Missing parameter '${name}' for route '${route}' when generating a navigation URL.`,
      )
    }
  })

  const paramNames = params.map((param) => param[0])
  const extraArgKeys = Object.keys(args)
    .filter((x) => !paramNames.includes(x))
    .filter((x) => args[x] !== undefined && args[x] !== null)

  // Append any unnamed params as search params.
  if (extraArgKeys.length) {
    const extraArgs = Object.fromEntries(
      extraArgKeys.map((key) => [key, `${args[key]}`]),
    )
    path += `?${new URLSearchParams(extraArgs).toString()}`
  }

  return path
}

export type FlattenSearchParams = ReturnType<typeof flattenSearchParams>

/**
 * Returns a flat array of search params
 *
 * `useMatch` hook options `searchParams` requires a flat array
 *
 * Example:
 * ```
 *   parseSearch('?key1=val1&key2=val2')
 *   => { key1: 'val1', key2: 'val2' }
 *
 *   flattenSearchParams(parseSearch('?key1=val1&key2=val2'))
 *   => [ { key1: 'val1' }, { key2: 'val2' } ]
 * ```
 */
export function flattenSearchParams(queryString: string) {
  const searchParams: Record<string, unknown>[] = []

  for (const [key, value] of Object.entries(parseSearch(queryString))) {
    searchParams.push({ [key]: value })
  }

  return searchParams
}

/**
 * Detect if we're in an iframe.
 *
 * From https://stackoverflow.com/questions/326069/how-to-identify-if-a-webpage-is-being-loaded-inside-an-iframe-or-directly-into-t
 */
export function inIframe() {
  try {
    return global?.self !== global?.top
  } catch {
    return true
  }
}
