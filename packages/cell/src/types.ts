import type React from "react";

import type { DocumentNode, OperationVariables, TypedDocumentNode } from "@apollo/client";
import type { useQuery } from "@apollo/client/react";

export type CellSuccessProps<
  TData extends object,
  TVariables extends OperationVariables = OperationVariables,
> = TData &
  CellLifecycleVariableProps<TVariables> & {
    readonly queryResult?: CellQueryResult<TData, TVariables>;
  };

export type CellFailureProps<
  TVariables extends OperationVariables = OperationVariables,
  TData extends object = object,
> = CellLifecycleVariableProps<TVariables> & {
  readonly error: Error;
  readonly errorCode?: string;
  readonly queryResult?: CellQueryResult<TData, TVariables>;
};

export type CellLoadingProps<
  TVariables extends OperationVariables = OperationVariables,
  TData extends object = object,
> = CellLifecycleVariableProps<TVariables> & {
  readonly queryResult?: CellQueryResult<TData, TVariables>;
};

export type CellQueryResult<
  TData extends object,
  TVariables extends OperationVariables,
> = useQuery.Result<TData, TVariables, "complete" | "empty" | "streaming", Partial<TVariables>>;

export type CellDocument<TData extends object, TVariables extends OperationVariables> =
  | DocumentNode
  | TypedDocumentNode<TData, TVariables>;

export type CellQuery<
  TData extends object,
  TVariables extends OperationVariables,
  TCellProps extends object,
> =
  | CellDocument<TData, TVariables>
  | ((props: React.PropsWithChildren<TCellProps>) => CellDocument<TData, TVariables>);

export type BeforeQueryOptions<TData extends object, TVariables extends OperationVariables> = Omit<
  useQuery.Options<TData, TVariables>,
  "variables"
> & {
  readonly variables: TVariables;
};

export type BeforeQueryResult<TData extends object, TVariables extends OperationVariables> =
  | TVariables
  | BeforeQueryOptions<TData, TVariables>;

export type CellVariableProps<
  TVariables extends OperationVariables,
  TProps extends object,
> = TProps &
  (
    | (InputVarProps<TVariables> & {
        readonly variables?: TVariables;
      })
    | {
        readonly variables: TVariables;
      }
  );

export type CellMappedProps<
  TVariables extends OperationVariables,
  TProps extends object,
> = TProps & {
  readonly variables?: TVariables;
};

export type InputVarProps<TVariables extends OperationVariables> =
  TVariables extends Record<string, never> ? object : TVariables;

type CellLifecycleVariableProps<TVariables extends OperationVariables> =
  InputVarProps<TVariables> & {
    readonly variables?: TVariables;
  };

export interface CreateCellBaseOptions<
  TData extends object,
  TVariables extends OperationVariables,
  TCellProps extends object,
> {
  readonly QUERY: CellQuery<TData, TVariables, TCellProps>;
  readonly Loading?: React.ComponentType<TCellProps & CellQueryResultProp<TData, TVariables>>;
  readonly Failure?: React.ComponentType<TCellProps & CellFailureStateProps<TData, TVariables>>;
  readonly Success: React.ComponentType<
    TCellProps & TData & CellQueryResultProp<TData, TVariables>
  >;
  readonly Empty?: React.ComponentType<TCellProps & TData & CellQueryResultProp<TData, TVariables>>;
  readonly isEmpty?: (data: TData) => boolean;
  readonly displayName?: string;
}

type CellQueryResultProp<TData extends object, TVariables extends OperationVariables> = {
  readonly queryResult?: CellQueryResult<TData, TVariables>;
};

type CellFailureStateProps<
  TData extends object,
  TVariables extends OperationVariables,
> = CellQueryResultProp<TData, TVariables> & {
  readonly error: Error;
  readonly errorCode?: string;
};

export interface CreateCellOptions<
  TData extends object,
  TVariables extends OperationVariables = OperationVariables,
  TProps extends object = object,
> extends CreateCellBaseOptions<TData, TVariables, CellVariableProps<TVariables, TProps>> {
  readonly beforeQuery?: undefined;
}

export interface CreateCellOptionsWithBeforeQuery<
  TData extends object,
  TVariables extends OperationVariables = OperationVariables,
  TProps extends object = InputVarProps<TVariables>,
> extends CreateCellBaseOptions<TData, TVariables, CellMappedProps<TVariables, TProps>> {
  readonly beforeQuery: (props: TProps) => BeforeQueryResult<TData, TVariables>;
}
