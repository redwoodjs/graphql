// Override useQuery and useMutation types
import type {
  QueryHookOptions,
  QueryResult,
  MutationHookOptions,
  MutationTuple,
  OperationVariables,
  SubscriptionHookOptions,
  SubscriptionResult,
  UseSuspenseQueryResult,
  SuspenseQueryHookOptions,
} from '@apollo/client'

// @MARK: Override relevant types from Apollo here
declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface QueryOperationResult<
    TData = any,
    TVariables extends OperationVariables = OperationVariables,
  > extends QueryResult<TData, TVariables> {}

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface MutationOperationResult<TData, TVariables>
    extends MutationTuple<TData, TVariables> {}

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface SubscriptionOperationResult<
    TData = any,
    TVariables extends OperationVariables = OperationVariables,
  > extends SubscriptionResult<TData, TVariables> {}

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface GraphQLQueryHookOptions<
    TData,
    TVariables extends OperationVariables,
  > extends QueryHookOptions<TData, TVariables> {}

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface GraphQLMutationHookOptions<TData, TVariables>
    extends MutationHookOptions<TData, TVariables> {}

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface GraphQLSubscriptionHookOptions<
    TData,
    TVariables extends OperationVariables,
  > extends SubscriptionHookOptions<TData, TVariables> {}

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface SuspenseQueryOperationResult<
    TData = any,
    TVariables extends OperationVariables = OperationVariables,
  > extends UseSuspenseQueryResult<TData, TVariables> {}

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface GraphQLSuspenseQueryHookOptions<
    TData,
    TVariables extends OperationVariables,
  > extends SuspenseQueryHookOptions<TData, TVariables> {}
}

export {}
