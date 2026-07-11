import React from 'react'

import type {
  ApolloClientOptions,
  setLogVerbosity,
  ApolloCache,
  InMemoryCacheConfig,
  HttpOptions,
  DocumentNode,
} from '@apollo/client'
import {
  ApolloProvider,
  ApolloClient,
  InMemoryCache,
  split,
  ApolloLink,
} from '@apollo/client'
import { setLogVerbosity as apolloSetLogVerbosity } from '@apollo/client/core/core.cjs'
import { setContext } from '@apollo/client/link/context/context.cjs'
import type { HttpLink } from '@apollo/client/link/http/http.cjs'
import { createPersistedQueryLink } from '@apollo/client/link/persisted-queries/persisted-queries.cjs'
import {
  useQuery,
  useMutation,
  useSubscription,
  useBackgroundQuery,
  useReadQuery,
  useSuspenseQuery,
} from '@apollo/client/react/hooks/hooks.cjs'
import { getMainDefinition } from '@apollo/client/utilities/utilities.cjs'
import { print } from 'graphql/language/printer.js'

import type { UseAuth } from '@redwoodjs/auth'
import { useNoAuth } from '@redwoodjs/auth'

import './typeOverride.js'
import { createUploadLink } from '../bundled/apollo-upload-client.js'
import {
  FetchConfigProvider,
  useFetchConfig,
} from '../components/FetchConfigProvider.js'
import { GraphQLHooksProvider } from '../components/GraphQLHooksProvider.js'

import {
  fragmentRegistry,
  registerFragment,
  registerFragments,
} from './fragmentRegistry.js'
import * as SSELinkExports from './sseLink.js'
import { useCache } from './useCache.js'

// Not sure why we need to import it this way for legacy builds to work
const { SSELink, isSubscription, isLiveQuery } = SSELinkExports

export type {
  CacheKey,
  FragmentIdentifier,
  RegisterFragmentResult,
} from './fragmentRegistry.js'

export { useCache }

export { fragmentRegistry, registerFragment, registerFragments }

export type ApolloClientCacheConfig = InMemoryCacheConfig

export type RedwoodApolloLinkName =
  | 'withToken'
  | 'authMiddleware'
  | 'updateDataApolloLink'
  | 'httpLink'

export type RedwoodApolloLink<
  Name extends RedwoodApolloLinkName,
  Link extends ApolloLink = ApolloLink,
> = {
  name: Name
  link: Link
}

export type RedwoodApolloLinks = [
  RedwoodApolloLink<'withToken'>,
  RedwoodApolloLink<'authMiddleware'>,
  RedwoodApolloLink<'updateDataApolloLink'>,
  RedwoodApolloLink<'httpLink', ApolloLink | HttpLink>,
]

export type RedwoodApolloLinkFactory = (links: RedwoodApolloLinks) => ApolloLink

export type GraphQLClientConfigProp = Omit<
  ApolloClientOptions<unknown>,
  'cache' | 'link'
> & {
  cache?: ApolloCache<unknown>
  /**
   * Configuration for Apollo Client's `InMemoryCache`.
   * See https://www.apollographql.com/docs/react/caching/cache-configuration/.
   */
  cacheConfig?: ApolloClientCacheConfig
  /**
   * Configuration for the terminating `HttpLink`.
   * See https://www.apollographql.com/docs/react/api/link/apollo-link-http/#httplink-constructor-options.
   *
   * For example, you can use this prop to set the credentials policy so that cookies can be sent to other domains:
   *
   * ```js
   * <RedwoodApolloProvider graphQLClientConfig={{
   *   httpLinkConfig: { credentials: 'include' }
   * }}>
   * ```
   */
  httpLinkConfig?: HttpOptions
  /**
   * Extend or overwrite `RedwoodApolloProvider`'s Apollo Link.
   *
   * To overwrite Redwood's Apollo Link, just provide your own `ApolloLink`.
   *
   * To extend Redwood's Apollo Link, provide a function—it'll get passed an array of Redwood's Apollo Links
   * which are objects with a name and link property:
   *
   * ```js
   * const link = (redwoodApolloLinks) => {
   *   const consoleLink = new ApolloLink((operation, forward) => {
   *     console.log(operation.operationName)
   *     return forward(operation)
   *   })
   *
   *   return ApolloLink.from([consoleLink, ...redwoodApolloLinks.map(({ link }) => link)])
   * }
   * ```
   *
   * If you do this, there's a few things you should keep in mind:
   * - your function should return a single link (e.g., using `ApolloLink.from`; see https://www.apollographql.com/docs/react/api/link/introduction/#additive-composition)
   * - the `HttpLink` should come last (https://www.apollographql.com/docs/react/api/link/introduction/#the-terminating-link)
   */
  link?: ApolloLink | RedwoodApolloLinkFactory
}

const ApolloProviderWithFetchConfig: React.FunctionComponent<{
  config: Omit<GraphQLClientConfigProp, 'cacheConfig' | 'cache'> & {
    cache: ApolloCache<unknown>
  }
  useAuth?: UseAuth
  logLevel: ReturnType<typeof setLogVerbosity>
  children: React.ReactNode
}> = ({ config, children, useAuth = useNoAuth, logLevel }) => {
  // Should they run into it, this helps users with the "Cannot render cell; GraphQL success but data is null" error.
  // See https://github.com/redwoodjs/redwood/issues/2473.
  apolloSetLogVerbosity(logLevel)

  // Here we're using Apollo Link to customize Apollo Client's data flow.
  // Although we're sending conventional HTTP-based requests and could just pass `uri` instead of `link`,
  // we need to fetch a new token on every request, making middleware a good fit for this.
  //
  // See https://www.apollographql.com/docs/react/api/link/introduction.
  const { getToken, type: authProviderType } = useAuth()

  // `updateDataApolloLink` keeps track of the most recent req/res data so they can be passed to
  // any errors passed up to an error boundary.
  type ApolloRequestData = {
    mostRecentRequest?: {
      operationName?: string
      operationKind?: string
      variables?: Record<string, unknown>
      query?: string
    }
    mostRecentResponse?: any
  }

  const data = {
    mostRecentRequest: undefined,
    mostRecentResponse: undefined,
  } as ApolloRequestData

  const updateDataApolloLink = new ApolloLink((operation, forward) => {
    const { operationName, query, variables } = operation

    data.mostRecentRequest = {}
    data.mostRecentRequest.operationName = operationName
    data.mostRecentRequest.operationKind = query?.kind.toString()
    data.mostRecentRequest.variables = variables
    data.mostRecentRequest.query = query && print(operation.query)

    return forward(operation).map((result) => {
      data.mostRecentResponse = result

      return result
    })
  })

  const withToken = setContext(async () => {
    const token = await getToken()

    return { token }
  })

  const { headers, uri } = useFetchConfig()

  const authMiddleware = new ApolloLink((operation, forward) => {
    const { token } = operation.getContext()

    // Only add auth headers when there's a token. `token` is `null` when `!isAuthenticated`.
    const authHeaders = token
      ? {
          'auth-provider': authProviderType,
          authorization: `Bearer ${token}`,
        }
      : {}

    operation.setContext(() => ({
      headers: {
        ...operation.getContext().headers,
        ...headers,
        // Duped auth headers, because we may remove the `FetchConfigProvider` at a later date.
        ...authHeaders,
      },
    }))

    return forward(operation)
  })

  const { httpLinkConfig, link: redwoodApolloLink, ...rest } = config ?? {}

  // A terminating link. Apollo Client uses this to send GraphQL operations to a server over HTTP.
  // See https://www.apollographql.com/docs/react/api/link/introduction/#the-terminating-link.
  // Internally uploadLink determines whether to use form-data vs http link
  const uploadLink: ApolloLink = createUploadLink({
    uri,
    ...httpLinkConfig,
    // The upload link types don't match the ApolloLink types, even though it comes from Apollo
    // because they use ESM imports and we're using the default ones.
  }) as unknown as ApolloLink

  // Our terminating link needs to be smart enough to handle subscriptions, and if the GraphQL query
  // is subscription it needs to use the SSELink (server sent events link).
  const uploadOrSSELink =
    typeof SSELink !== 'undefined'
      ? split(
          ({ query }) => {
            const definition = getMainDefinition(query)

            return isSubscription(definition) || isLiveQuery(definition)
          },
          new SSELink({
            url: uri,
            auth: { authProviderType, tokenFn: getToken },
            httpLinkConfig,
            headers,
          }),
          uploadLink,
        )
      : uploadLink

  /**
   * Use Trusted Documents aka Persisted Operations aka Queries
   *
   * When detecting a meta hash, Apollo Client will send the hash from the document and not the query itself.
   *
   * You must configure your GraphQL server to support this feature with the useTrustedDocuments option.
   *
   * See https://www.apollographql.com/docs/react/api/link/persisted-queries/
   */
  interface DocumentNodeWithMeta extends DocumentNode {
    __meta__?: {
      hash: string
    }
  }

  // Check if the query made includes the hash, and if so then make the request with the persisted query link
  const terminatingLink = split(
    ({ query }) => {
      const documentQuery = query as DocumentNodeWithMeta
      return documentQuery?.['__meta__']?.['hash'] !== undefined
    },
    createPersistedQueryLink({
      generateHash: (document: any) => document['__meta__']['hash'],
    }).concat(uploadOrSSELink),
    uploadOrSSELink,
  )

  // The order here is important. The last link *must* be a terminating link like HttpLink, SSELink, or the PersistedQueryLink.
  const redwoodApolloLinks: RedwoodApolloLinks = [
    { name: 'withToken', link: withToken },
    { name: 'authMiddleware', link: authMiddleware },
    { name: 'updateDataApolloLink', link: updateDataApolloLink },
    { name: 'httpLink', link: terminatingLink },
  ]

  let link = redwoodApolloLink

  link ??= ApolloLink.from(redwoodApolloLinks.map((l) => l.link))

  if (typeof link === 'function') {
    link = link(redwoodApolloLinks)
  }

  const client = new ApolloClient({
    // Default options for every Cell. Better to specify them here than in `beforeQuery` where it's too easy to overwrite them.
    // See https://www.apollographql.com/docs/react/api/core/ApolloClient/#example-defaultoptions-object.
    defaultOptions: {
      watchQuery: {
        // The `fetchPolicy` we expect:
        //
        // > Apollo Client executes the full query against both the cache and your GraphQL server.
        // > The query automatically updates if the result of the server-side query modifies cached fields.
        //
        // See https://www.apollographql.com/docs/react/data/queries/#cache-and-network.
        fetchPolicy: 'cache-and-network',
        // So that Cells rerender when refetching.
        // See https://www.apollographql.com/docs/react/data/queries/#inspecting-loading-states.
        notifyOnNetworkStatusChange: true,
      },
    },
    link,
    ...rest,
  })

  const extendErrorAndRethrow = (error: any, _errorInfo: React.ErrorInfo) => {
    error['mostRecentRequest'] = data.mostRecentRequest
    error['mostRecentResponse'] = data.mostRecentResponse
    throw error
  }

  return (
    <ApolloProvider client={client}>
      <ErrorBoundary onError={extendErrorAndRethrow}>{children}</ErrorBoundary>
    </ApolloProvider>
  )
}

type ComponentDidCatch = React.ComponentLifecycle<any, any>['componentDidCatch']

interface ErrorBoundaryProps {
  error?: unknown
  onError: NonNullable<ComponentDidCatch>
  children: React.ReactNode
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps> {
  componentDidCatch(...args: Parameters<NonNullable<ComponentDidCatch>>) {
    this.setState({})
    this.props.onError(...args)
  }

  render() {
    return this.props.children
  }
}

export const RedwoodApolloProvider: React.FunctionComponent<{
  graphQLClientConfig?: GraphQLClientConfigProp
  fragments?: DocumentNode[]
  useAuth?: UseAuth
  logLevel?: ReturnType<typeof setLogVerbosity>
  children: React.ReactNode
}> = ({
  graphQLClientConfig,
  fragments,
  useAuth = useNoAuth,
  logLevel = 'debug',
  children,
}) => {
  // Since Apollo Client gets re-instantiated on auth changes,
  // we have to instantiate `InMemoryCache` here, so that it doesn't get wiped.
  const { cacheConfig, ...config } = graphQLClientConfig ?? {}

  // Auto register fragments
  if (fragments) {
    fragmentRegistry.register(...fragments)
  }

  const cache = new InMemoryCache({
    fragments: fragmentRegistry,
    possibleTypes: cacheConfig?.possibleTypes,
    ...cacheConfig,
  }).restore(globalThis?.__REDWOOD__APOLLO_STATE ?? {})

  return (
    <FetchConfigProvider useAuth={useAuth}>
      <ApolloProviderWithFetchConfig
        // This order so that the user can still completely overwrite the cache.
        config={{ cache, ...config }}
        useAuth={useAuth}
        logLevel={logLevel}
      >
        <GraphQLHooksProvider
          useQuery={useQuery}
          useMutation={useMutation}
          useSubscription={useSubscription}
          useBackgroundQuery={useBackgroundQuery}
          useReadQuery={useReadQuery}
          useSuspenseQuery={useSuspenseQuery}
        >
          {children}
        </GraphQLHooksProvider>
      </ApolloProviderWithFetchConfig>
    </FetchConfigProvider>
  )
}
