import type { ComponentProps, JSXElementConstructor } from 'react'

import type {
  ApolloClient,
  NetworkStatus,
  OperationVariables,
  QueryRef,
  UseBackgroundQueryResult,
} from '@apollo/client'
import type { DocumentNode } from 'graphql'
import type { A, L, O, U } from 'ts-toolbelt'

/**
 *
 * If the Cell has a `beforeQuery` function, then the variables are not required,
 * but instead the arguments of the `beforeQuery` function are required.
 *
 * If the Cell does not have a `beforeQuery` function, then the variables are required.
 *
 * Note that a query that doesn't take any variables is defined as {[x: string]: never}
 * The ternary at the end makes sure we don't include it, otherwise it won't allow merging any
 * other custom props from the Success component.
 *
 */
type CellPropsVariables<Cell, GQLVariables> = Cell extends {
  beforeQuery: (...args: any[]) => any
}
  ? Parameters<Cell['beforeQuery']>[0] extends unknown
    ? Record<string, unknown>
    : Parameters<Cell['beforeQuery']>[0]
  : GQLVariables extends Record<string, never>
    ? unknown
    : GQLVariables
/**
 * Cell component props which is the combination of query variables and Success props.
 */

export type CellProps<
  CellSuccess extends keyof JSX.IntrinsicElements | JSXElementConstructor<any>,
  GQLResult,
  CellType,
  GQLVariables,
> = A.Compute<
  Omit<
    ComponentProps<CellSuccess>,
    | keyof CellPropsVariables<CellType, GQLVariables>
    | keyof GQLResult
    | 'updating'
    | 'queryResult'
  > &
    CellPropsVariables<CellType, GQLVariables>
>

type InputVarProps<T> = T extends { [key: string]: never } ? unknown : T

export type CellLoadingProps<TVariables extends OperationVariables = any> = {
  queryResult?:
    | NonSuspenseCellQueryResult<TVariables, any>
    | SuspenseCellQueryResult
} & InputVarProps<TVariables>

export type CellFailureProps<TVariables extends OperationVariables = any> = {
  queryResult?:
    | NonSuspenseCellQueryResult<TVariables, any>
    | SuspenseCellQueryResult
  error?: QueryOperationResult['error'] | Error // for tests and storybook

  /**
   * @see {@link https://www.apollographql.com/docs/apollo-server/data/errors/#error-codes}
   */
  errorCode?: string
  updating?: boolean
} & InputVarProps<TVariables>

// aka guarantee that all properties in T exist
type Guaranteed<T> = {
  [K in keyof T]-?: NonNullable<T[K]>
}

type KeyCount<T extends object> = L.Length<U.ListOf<O.SelectKeys<T, any>>>

// This is used for the Success component in Cells. If there is only one thing
// being returned by the Cell we can guarantee that the data is not null or
// undefined. If there are are multiple roots we can't guarantee that because
// the default isEmpty check only makes sure there is _some_ data – not that
// all properties have data
// NOTE: This only holds true for Cells as Redwood generates them. If the user
// removes the <Empty> component, or provides their own isEmpty implementation
// there's no way for us to know what the data will look like.
type ConditionallyGuaranteed<T extends object> =
  KeyCount<T> extends 1 ? Guaranteed<T> : T

/**
 * @params TData = Type of data based on your graphql query. This can be imported from 'types/graphql'
 * @example
 * import type { FindPosts } from 'types/graphql'
 *
 * const { post }: CellSuccessData<FindPosts> = props
 */
export type CellSuccessData<TData = any> = ConditionallyGuaranteed<
  Omit<TData, '__typename'>
>

/**
 * @MARK not sure about this partial, but we need to do this for tests and storybook.
 *
 * `updating` is just `loading` renamed; since Cells default to stale-while-refetch,
 * this prop lets users render something like a spinner to show that a request is in-flight.
 */

export type CellSuccessProps<
  TData = any,
  TVariables extends OperationVariables = any,
> = {
  queryResult?:
    | NonSuspenseCellQueryResult<TVariables, TData>
    | SuspenseCellQueryResult
  updating?: boolean
} & InputVarProps<TVariables> &
  // pre-computing makes the types more readable on hover
  A.Compute<CellSuccessData<TData>>

/**
 * A coarse type for the `data` prop returned by `useQuery`.
 *
 * ```js
 * {
 *   data: {
 *     post: { ... }
 *   }
 * }
 * ```
 */
export type DataObject = { [key: string]: unknown }
/**
 * The main interface.
 */

export interface CreateCellProps<CellProps, CellVariables> {
  /**
   * The GraphQL syntax tree to execute or function to call that returns it.
   * If `QUERY` is a function, it's called with the result of `beforeQuery`.
   */
  QUERY: DocumentNode | ((variables: Record<string, unknown>) => DocumentNode)
  /**
   * Parse `props` into query variables. Most of the time `props` are appropriate variables as is.
   */
  beforeQuery?:
    | ((props: CellProps) => { variables: CellVariables })
    | (() => { variables: CellVariables })
  /**
   * Sanitize the data returned from the query.
   */
  afterQuery?: (data: DataObject) => DataObject
  /**
   * How to decide if the result of a query should render the `Empty` component.
   * The default implementation checks that the first field isn't `null` or an empty array.
   *
   * @example
   *
   * In the example below, only `users` is checked:
   *
   * ```js
   * export const QUERY = gql`
   *   users {
   *     name
   *   }
   *   posts {
   *     title
   *   }
   * `
   * ```
   */
  isEmpty?: (
    response: DataObject,
    options: {
      isDataEmpty: (data: DataObject) => boolean
    },
  ) => boolean
  /**
   * If the query's in flight and there's no stale data, render this.
   */
  Loading?: React.FC<CellLoadingProps & Partial<CellProps>>
  /**
   * If something went wrong, render this.
   */
  Failure?: React.FC<CellFailureProps & Partial<CellProps>>
  /**
   * If no data was returned, render this.
   */
  Empty?: React.FC<CellSuccessProps & Partial<CellProps>>
  /**
   * If data was returned, render this.
   */
  Success: React.FC<CellSuccessProps & Partial<CellProps>>
  /**
   * What to call the Cell. Defaults to the filename.
   */
  displayName?: string
}

export type SuspendingSuccessProps = React.PropsWithChildren<
  Record<string, unknown>
> & {
  queryRef: QueryRef<DataObject> // from useBackgroundQuery
  suspenseQueryResult: SuspenseCellQueryResult<DataObject, any>
  userProps: Record<string, any> // we don't really care about the types here, we are just forwarding on
}

export type NonSuspenseCellQueryResult<
  TVariables extends OperationVariables = any,
  TData = any,
> = Partial<
  Omit<QueryOperationResult<TData, TVariables>, 'loading' | 'error' | 'data'>
>

// We call this queryResult in createCell, sadly a very overloaded term
// This is just the extra things returned from useXQuery hooks
export interface SuspenseCellQueryResult<
  _TData = any,
  _TVariables extends OperationVariables = any,
> extends UseBackgroundQueryResult {
  client: ApolloClient<any>
  // fetchMore & refetch  come from UseBackgroundQueryResult
  networkStatus?: NetworkStatus
  called: boolean // set if queryRef present
}
