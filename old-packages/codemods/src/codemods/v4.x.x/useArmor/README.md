# Use Armor

RedwoodJS v4 uses GraphQL Armor to enforce default GraphQL security best practices.

Prior to v4, Redwood's GraphQLHandler could configure a Query Depth Limit​ to guarded against cyclical and deeply nested malicious operations.

```ts
export const handler = createGraphQLHandler({
  loggerConfig: { logger, options: { query: true } },
  depthLimitOptions: { maxDepth: 6 },
  // ...
})
```

This codemod replaces any current `depthLimitOptions` with the equivalent GraphQL Armor configuration.

```ts
export const handler = createGraphQLHandler({
  loggerConfig: { logger, options: { query: true } },
  armorConfig: { maxDepth: { n: 6 } },
  // ...
})
```

If `depthLimitOptions` are not configured, no mods are applied.
