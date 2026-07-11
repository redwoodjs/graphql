import type React from "react";

import type { OperationVariables } from "@apollo/client";
import { useQuery } from "@apollo/client/react";

import type {
  BeforeQueryOptions,
  BeforeQueryResult,
  CellMappedProps,
  CellVariableProps,
  CreateCellBaseOptions,
  CreateCellOptions,
  CreateCellOptionsWithBeforeQuery,
  InputVarProps,
} from "./types.js";

export function createCell<
  TData extends object,
  TVariables extends OperationVariables = OperationVariables,
  TProps extends object = object,
>(
  options: CreateCellOptions<TData, TVariables, TProps>,
): React.ComponentType<React.PropsWithChildren<CellVariableProps<TVariables, TProps>>>;
export function createCell<
  TData extends object,
  TVariables extends OperationVariables = OperationVariables,
  TProps extends object = InputVarProps<TVariables>,
>(
  options: CreateCellOptionsWithBeforeQuery<TData, TVariables, TProps>,
): React.ComponentType<React.PropsWithChildren<CellMappedProps<TVariables, TProps>>>;
export function createCell<
  TData extends object,
  TVariables extends OperationVariables,
  TProps extends object,
>(
  options:
    | CreateCellOptions<TData, TVariables, TProps>
    | CreateCellOptionsWithBeforeQuery<TData, TVariables, TProps>,
) {
  if (options.beforeQuery) {
    return createCellComponent<TData, TVariables, CellMappedProps<TVariables, TProps>, TProps>(
      options,
    );
  }

  return createCellComponent<
    TData,
    TVariables,
    CellVariableProps<TVariables, TProps>,
    CellVariableProps<TVariables, TProps>
  >(options);
}

function createCellComponent<
  TData extends object,
  TVariables extends OperationVariables,
  TCellProps extends { readonly variables?: TVariables },
  TBeforeQueryProps extends object,
>({
  QUERY,
  Loading = DefaultLoading,
  Failure,
  Success,
  Empty,
  isEmpty = defaultIsEmpty,
  displayName = "Cell",
  beforeQuery,
}: CreateCellBaseOptions<TData, TVariables, TCellProps> & {
  readonly beforeQuery?: (props: TBeforeQueryProps) => BeforeQueryResult<TData, TVariables>;
}): React.ComponentType<React.PropsWithChildren<TCellProps>> {
  function Cell(props: React.PropsWithChildren<TCellProps>) {
    const query = typeof QUERY === "function" ? QUERY(props) : QUERY;
    const queryOptions = getQueryOptions<TData, TVariables, TCellProps, TBeforeQueryProps>(
      props,
      beforeQuery,
    );
    const queryResult = useQuery<TData, TVariables>(query, queryOptions);
    const { data, loading, error } = queryResult;

    if (error) {
      if (!Failure) {
        throw error;
      }

      return (
        <Failure
          {...props}
          error={error}
          errorCode={getErrorCode(error)}
          queryResult={queryResult}
        />
      );
    }

    if (data) {
      const State = Empty && isEmpty(data) ? Empty : Success;

      return <State {...props} {...data} queryResult={queryResult} />;
    }

    if (loading) {
      return <Loading {...props} queryResult={queryResult} />;
    }

    throw new CellRenderStateError();
  }

  Cell.displayName = displayName;

  return Cell;
}

class CellRenderStateError extends Error {
  constructor() {
    super(
      "Cannot render Cell: reached an unexpected state where the query succeeded but `data` is null.",
    );
    this.name = "CellRenderStateError";
  }
}

function DefaultLoading() {
  return <>Loading...</>;
}

const DEFAULT_CELL_QUERY_OPTIONS = {
  fetchPolicy: "cache-first",
} as const satisfies Partial<useQuery.Options<object, OperationVariables>>;

function getQueryOptions<
  TData extends object,
  TVariables extends OperationVariables,
  TCellProps extends { readonly variables?: TVariables },
  TBeforeQueryProps extends object,
>(
  props: React.PropsWithChildren<TCellProps>,
  beforeQuery?: (props: TBeforeQueryProps) => BeforeQueryResult<TData, TVariables>,
): useQuery.Options<TData, TVariables> {
  const { children: _children, variables: explicitVariables, ...cellProps } = props;

  if (beforeQuery) {
    const beforeQueryResult = beforeQuery(cellProps as TBeforeQueryProps);

    if (isQueryOptions(beforeQueryResult)) {
      return {
        ...DEFAULT_CELL_QUERY_OPTIONS,
        ...beforeQueryResult,
      };
    }

    return {
      ...DEFAULT_CELL_QUERY_OPTIONS,
      variables: beforeQueryResult,
    };
  }

  if (explicitVariables) {
    return {
      ...DEFAULT_CELL_QUERY_OPTIONS,
      variables: explicitVariables,
    };
  }

  return {
    ...DEFAULT_CELL_QUERY_OPTIONS,
    variables: cellProps as TVariables,
  };
}

function isQueryOptions<TData extends object, TVariables extends OperationVariables>(
  value: BeforeQueryResult<TData, TVariables>,
): value is BeforeQueryOptions<TData, TVariables> {
  return typeof value === "object" && value !== null && "variables" in value;
}

function defaultIsEmpty<TData extends object>(data: TData) {
  const values = Object.values(data);

  if (values.length === 0) {
    return true;
  }

  return values.every((value) => {
    if (value === null || value === undefined) {
      return true;
    }

    return Array.isArray(value) && value.length === 0;
  });
}

function getErrorCode(error: Error): string | undefined {
  if (!("graphQLErrors" in error)) {
    return undefined;
  }

  const { graphQLErrors } = error;

  if (!Array.isArray(graphQLErrors)) {
    return undefined;
  }

  const [firstError] = graphQLErrors;

  if (typeof firstError !== "object" || firstError === null || !("extensions" in firstError)) {
    return undefined;
  }

  const { extensions } = firstError;

  if (typeof extensions !== "object" || extensions === null || !("code" in extensions)) {
    return undefined;
  }

  return typeof extensions.code === "string" ? extensions.code : undefined;
}
