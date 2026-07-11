# Cell QueryResult

RedwoodJS v5 no longer spreads the additional properties returned by a query result when passing properties into a cell.

Prior to v5, Redwood would spread properties such as `client` or `refetch` which were returned by the query result for use within the first parameter of a cell. See https://www.apollographql.com/docs/react/data/queries/#result for the properties returned by Apollo. This would in some cases restrict the choice of naming the query result as the data would be overridden by these additional query result properties. In v5 these additional properties (all but `loading`, `error` and `data`) are passed via a `queryResult` property.

Prior to v5 access to the additional query result properties was possible like so:

```ts
export const Success = ({ model, client: apolloClient, refetch }: CellSuccessProps<FindModelById>) => {
  // Access to apolloClient or refetch is possible
  return <Model model={model} />
}
```

This codemod removes any occurrence of these previously spread variables from the parameters and instead provides them via the destructuring of `queryResult`. This results in:

```ts
export const Success = ({ model, queryResult: {client: apolloClient, refetch} }: CellSuccessProps<FindModelById>) => {
  // Access to apolloClient or refetch is still possible via the nested destructuring
  return <Model model={model} />
}
```
