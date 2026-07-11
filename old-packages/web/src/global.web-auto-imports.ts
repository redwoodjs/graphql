import type _React from 'react'

import type { DocumentNode } from 'graphql'

// These are the global types exposed to a user's project
// For "internal" global types see ambient.d.ts

declare global {
  // This type is used for both regular RW projects and projects that have
  // enabled Trusted Documents. For regular RW projects, this could have been
  // typed just by importing gql from `graphql-tag`. But for Trusted Documents
  // the type should be imported from `web/src/graphql/gql` in the user's
  // project. The type here is generic enough to cover both cases.
  const gql: (
    source: string | TemplateStringsArray | readonly string[],
    ...args: any[]
  ) => DocumentNode

  // Having this as a type instead of a const allows us to augment/override it
  // in other packages
  type React = typeof _React

  interface Window {
    /** URL or absolute path to the GraphQL serverless function */
    RWJS_API_GRAPHQL_URL: string
    /** URL or absolute path to serverless functions */
    RWJS_API_URL: string
    __REDWOOD__APP_TITLE: string
  }

  type GraphQLOperationVariables = Record<string, any>

  /* eslint-disable @typescript-eslint/no-unused-vars */
  // Overridable graphQL hook return types
  interface QueryOperationResult<
    TData = any,
    TVariables = GraphQLOperationVariables,
  > {
    data: TData | undefined
    loading: boolean
    // @MARK not adding error here, as it gets overridden by type overrides
    // see packages/web/src/apollo/typeOverride.ts
  }

  // not defining it here, because it gets overridden by Apollo provider anyway
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface MutationOperationResult<TData, TVariables> {}

  // Overridable useQuery and useMutation hooks
  interface GraphQLQueryHookOptions<TData, TVariables> {
    variables?: TVariables
    [key: string]: any
  }

  export interface GraphQLMutationHookOptions<TData, TVariables> {
    variables?: TVariables
    onCompleted?: (data: TData) => void
    [key: string]: any
  }
}
