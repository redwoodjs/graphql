import React from 'react'

import type {
  OperationVariables,
  useBackgroundQuery as apolloUseBackgroundQuery,
  useReadQuery as apolloUseReadQuery,
} from '@apollo/client'
import type { TypedDocumentNode } from '@graphql-typed-document-node/core'
import type { DocumentNode } from 'graphql'

export type { TypedDocumentNode }

/**
 * @NOTE
 * The types QueryOperationResult, MutationOperationResult, SubscriptionOperationResult, and SuspenseQueryOperationResult
 * are overridden in packages/web/src/apollo/typeOverride.ts. This was originally so that you could bring your own gql client.
 *
 * The default (empty) types are defined in packages/web/src/global.web-auto-imports.ts
 *
 * Do not import types for hooks directly from Apollo here, unless it is an Apollo specific hook.
 */

type DefaultUseQueryType = <
  TData = any,
  TVariables extends OperationVariables = GraphQLOperationVariables,
>(
  query: DocumentNode | TypedDocumentNode<TData, TVariables>,
  options?: GraphQLQueryHookOptions<TData, TVariables>,
) => QueryOperationResult<TData, TVariables>

type DefaultUseMutationType = <
  TData = any,
  TVariables = GraphQLOperationVariables,
>(
  mutation: DocumentNode | TypedDocumentNode<TData, TVariables>,
  options?: GraphQLMutationHookOptions<TData, TVariables>,
) => MutationOperationResult<TData, TVariables>

type DefaultUseSubscriptionType = <
  TData = any,
  TVariables extends OperationVariables = GraphQLOperationVariables,
>(
  subscription: DocumentNode | TypedDocumentNode<TData, TVariables>,
  options?: GraphQLSubscriptionHookOptions<TData, TVariables>,
) => SubscriptionOperationResult<TData, TVariables>

type DefaultUseSuspenseType = <
  TData = any,
  TVariables extends OperationVariables = GraphQLOperationVariables,
>(
  query: DocumentNode | TypedDocumentNode<TData, TVariables>,
  options?: GraphQLSuspenseQueryHookOptions<TData, TVariables>,
) => SuspenseQueryOperationResult<TData, TVariables>

export interface GraphQLHooks<
  TuseQuery = DefaultUseQueryType,
  TuseMutation = DefaultUseMutationType,
  TuseSubscription = DefaultUseSubscriptionType,
  TuseSuspenseQuery = DefaultUseSuspenseType,
> {
  useQuery: TuseQuery
  useMutation: TuseMutation
  useSubscription: TuseSubscription
  useSuspenseQuery: TuseSuspenseQuery
  // @NOTE note that we aren't using typeoverride here.
  // This is because useBackgroundQuery and useReadQuery are apollo specific hooks.
  useBackgroundQuery: typeof apolloUseBackgroundQuery
  useReadQuery: typeof apolloUseReadQuery
}

export const GraphQLHooksContext = React.createContext<GraphQLHooks>({
  useQuery: () => {
    throw new Error(
      'You must register a useQuery hook via the `GraphQLHooksProvider`',
    )
  },
  useMutation: () => {
    throw new Error(
      'You must register a useMutation hook via the `GraphQLHooksProvider`',
    )
  },
  useSubscription: () => {
    throw new Error(
      'You must register a useSubscription hook via the `GraphQLHooksProvider`',
    )
  },
  useSuspenseQuery: () => {
    throw new Error(
      'You must register a useSuspenseQuery hook via the `GraphQLHooksProvider`.',
    )
  },

  //  These are apollo specific hooks!
  useBackgroundQuery: () => {
    throw new Error(
      'You must register a useBackgroundQuery hook via the `GraphQLHooksProvider`.',
    )
  },

  useReadQuery: () => {
    throw new Error(
      'You must register a useReadQuery hook via the `GraphQLHooksProvider`.',
    )
  },
})

interface GraphQlHooksProviderProps<
  TuseQuery = DefaultUseQueryType,
  TuseMutation = DefaultUseMutationType,
  TuseSubscription = DefaultUseSubscriptionType,
  TuseSuspenseQuery = DefaultUseSuspenseType,
> extends GraphQLHooks<
    TuseQuery,
    TuseMutation,
    TuseSubscription,
    TuseSuspenseQuery
  > {
  children: React.ReactNode
}

/**
 * GraphQLHooksProvider stores standard `useQuery` and `useMutation` hooks for Redwood
 * that can be mapped to your GraphQL library of choice's own `useQuery`
 * and `useMutation` implementation.
 *
 * @todo Let the user pass in the additional type for options.
 */
export const GraphQLHooksProvider = <
  TuseQuery extends DefaultUseQueryType,
  TuseMutation extends DefaultUseMutationType,
>({
  useQuery,
  useMutation,
  useSubscription,
  useSuspenseQuery,
  useBackgroundQuery,
  useReadQuery,
  children,
}: GraphQlHooksProviderProps<TuseQuery, TuseMutation>) => {
  return (
    <GraphQLHooksContext.Provider
      value={{
        useQuery,
        useMutation,
        useSubscription,
        useSuspenseQuery,
        useBackgroundQuery,
        useReadQuery,
      }}
    >
      {children}
    </GraphQLHooksContext.Provider>
  )
}

export function useQuery<
  TData = any,
  TVariables extends OperationVariables = GraphQLOperationVariables,
>(
  query: DocumentNode | TypedDocumentNode<TData, TVariables>,
  options?: GraphQLQueryHookOptions<TData, TVariables>,
): QueryOperationResult<TData, TVariables> {
  return React.useContext(GraphQLHooksContext).useQuery<TData, TVariables>(
    query,
    options,
  )
}

export function useMutation<
  TData = any,
  TVariables = GraphQLOperationVariables,
>(
  mutation: DocumentNode | TypedDocumentNode<TData, TVariables>,
  options?: GraphQLMutationHookOptions<TData, TVariables>,
): MutationOperationResult<TData, TVariables> {
  return React.useContext(GraphQLHooksContext).useMutation<TData, TVariables>(
    mutation,
    options,
  )
}

export function useSubscription<
  TData = any,
  TVariables extends OperationVariables = GraphQLOperationVariables,
>(
  query: DocumentNode | TypedDocumentNode<TData, TVariables>,
  options?: GraphQLSubscriptionHookOptions<TData, TVariables>,
): SubscriptionOperationResult<TData, TVariables> {
  return React.useContext(GraphQLHooksContext).useSubscription<
    TData,
    TVariables
  >(query, options)
}

export function useSuspenseQuery<
  TData = any,
  TVariables extends OperationVariables = GraphQLOperationVariables,
>(
  query: DocumentNode | TypedDocumentNode<TData, TVariables>,
  options?: GraphQLSuspenseQueryHookOptions<TData, TVariables>,
): SuspenseQueryOperationResult<TData, TVariables> {
  return React.useContext(GraphQLHooksContext).useSuspenseQuery<
    TData,
    TVariables
  >(query, options)
}

export const useBackgroundQuery: typeof apolloUseBackgroundQuery<any> = (
  ...args
) => {
  // @TODO something about the apollo types here mean I need to override the return type
  return React.useContext(GraphQLHooksContext).useBackgroundQuery(
    ...args,
  ) as any
}

export const useReadQuery: typeof apolloUseReadQuery = (...args) => {
  return React.useContext(GraphQLHooksContext).useReadQuery(...args)
}
