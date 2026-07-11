import React from 'react'

import { fragmentRegistry } from '../../apollo/fragmentRegistry.js'
import { getOperationName } from '../../graphql.js'
/**
 * This is part of how we let users swap out their GraphQL client while staying compatible with Cells.
 */
import { useQuery } from '../GraphQLHooksProvider.js'

import { useCellCacheContext } from './CellCacheContext.js'
import type { CreateCellProps } from './cellTypes.js'
import { createSuspendingCell } from './createSuspendingCell.js'
import { isDataEmpty } from './isCellEmpty.js'

// 👇 Note how we switch which cell factory to use!
export const createCell = RWJS_ENV.RWJS_EXP_STREAMING_SSR
  ? createSuspendingCell
  : createNonSuspendingCell

/**
 * Creates a Cell out of a GraphQL query and components that track to its lifecycle.
 */
function createNonSuspendingCell<
  CellProps extends Record<string, unknown>,
  CellVariables extends Record<string, unknown>,
>({
  QUERY,
  beforeQuery = (props) => ({
    // By default, we assume that the props are the gql-variables.
    variables: props as unknown as CellVariables,
    /**
     * We're duplicating these props here due to a suspected bug in Apollo Client v3.5.4
     * (it doesn't seem to be respecting `defaultOptions` in `RedwoodApolloProvider`.)
     *
     * @see {@link https://github.com/apollographql/apollo-client/issues/9105}
     */
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  }),
  afterQuery = (data) => data,
  isEmpty = isDataEmpty,
  Loading = () => <>Loading...</>,
  Failure,
  Empty,
  Success,
  displayName = 'Cell',
}: CreateCellProps<CellProps, CellVariables>): React.FC<CellProps> {
  function NamedCell(props: React.PropsWithChildren<CellProps>) {
    /**
     * Right now, Cells don't render `children`.
     */
    const { children: _, ...variables } = props
    const options = beforeQuery(variables as CellProps)
    const query = typeof QUERY === 'function' ? QUERY(options) : QUERY

    // queryRest includes `variables: { ... }`, with any variables returned
    // from beforeQuery
    let {
      // eslint-disable-next-line prefer-const
      error,
      loading,
      data,
      ...queryResult
    } = useQuery(query, options)

    if (globalThis.__REDWOOD__PRERENDERING) {
      // __REDWOOD__PRERENDERING will always either be set, or not set. So
      // rules-of-hooks are still respected, even though we wrap this in an if
      // statement
      /* eslint-disable-next-line react-hooks/rules-of-hooks */
      const { queryCache } = useCellCacheContext()
      const operationName = getOperationName(query)
      const transformedQuery = fragmentRegistry.transform(query)

      let cacheKey

      if (operationName) {
        cacheKey = operationName + '_' + JSON.stringify(variables)
      } else {
        const cellName = displayName === 'Cell' ? 'the cell' : displayName

        throw new Error(
          `The gql query in ${cellName} is missing an operation name. ` +
            'Something like FindBlogPostQuery in ' +
            '`query FindBlogPostQuery($id: Int!)`',
        )
      }

      const queryInfo = queryCache[cacheKey]

      // This is true when the graphql handler couldn't be loaded
      // So we fallback to the loading state
      if (queryInfo?.renderLoading) {
        loading = true
      } else {
        if (queryInfo?.hasProcessed) {
          loading = false
          data = queryInfo.data

          // All of the gql client's props aren't available when pre-rendering,
          // so using `any` here
          queryResult = { variables } as any
        } else {
          queryCache[cacheKey] ||= {
            query: transformedQuery,
            variables: options.variables,
            hasProcessed: false,
          }
        }
      }
    }

    if (error) {
      if (Failure) {
        // errorCode is not part of the type returned by useQuery
        // but it is returned as part of the queryResult
        type QueryResultWithErrorCode = typeof queryResult & {
          errorCode: string
        }

        return (
          <Failure
            error={error}
            errorCode={
              // Use the ad-hoc QueryResultWithErrorCode type to access the errorCode
              (queryResult as QueryResultWithErrorCode).errorCode ??
              (error.graphQLErrors?.[0]?.extensions?.['code'] as string)
            }
            {...props}
            updating={loading}
            queryResult={queryResult}
          />
        )
      } else {
        throw error
      }
    } else if (data) {
      const afterQueryData = afterQuery(data)

      if (isEmpty(data, { isDataEmpty }) && Empty) {
        return (
          <Empty
            {...props}
            {...afterQueryData}
            updating={loading}
            queryResult={queryResult}
          />
        )
      } else {
        return (
          <Success
            {...props}
            {...afterQueryData}
            updating={loading}
            queryResult={queryResult}
          />
        )
      }
    } else if (loading) {
      return <Loading {...props} queryResult={queryResult} />
    } else {
      /**
       * There really shouldn't be an `else` here, but like any piece of software, GraphQL clients have bugs.
       * If there's no `error` and there's no `data` and we're not `loading`, something's wrong. Most likely with the cache.
       *
       * @see {@link https://github.com/redwoodjs/redwood/issues/2473#issuecomment-971864604}
       */
      console.warn(
        `If you're using Apollo Client, check for its debug logs here in the console, which may help explain the error.`,
      )
      throw new Error(
        'Cannot render Cell: reached an unexpected state where the query succeeded but `data` is `null`. If this happened in Storybook, your query could be missing fields; otherwise this is most likely a GraphQL caching bug. Note that adding an `id` field to all the fields on your query may fix the issue.',
      )
    }
  }

  NamedCell.displayName = displayName

  return (props: CellProps) => {
    return <NamedCell {...props} />
  }
}
