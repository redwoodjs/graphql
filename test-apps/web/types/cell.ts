/** App-level cell prop types for manually exported Success/Failure components. */
export type CellSuccessProps<TData extends object, TVariables extends object = object> = TData & {
  readonly variables?: TVariables;
};

export type CellFailureProps<TVariables extends object = object> = {
  readonly error: Error;
  readonly variables?: TVariables;
};
