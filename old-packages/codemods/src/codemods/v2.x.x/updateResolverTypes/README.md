# Update Resolver Types

- This codemod only affects TS projects.

It will find all service files, and if they have a relation resolver - it will convert the type to the newly generated relations resolver type.

Taking a specific case, in the test project we have Post.author, which is a relation (author is User on the DB).

```diff
// At the bottom of the file
- export const Post: PostResolvers = {
+ export const Post: PostRelationResolvers = {
  author: (_obj, gqlArgs) =>
    db.post.findUnique({ where: { id: gqlArgs?.root?.id } }).author(),
}
```

This is because of the `avoidOptionals` flag in graphql codegen. Look for this option in `packages/internal/src/generate/graphqlCodeGen.ts`

> Note:
> Very old RW projects don't even have these types in the services. This was introduced in v2.x, when we enabled Prisma model mapping in codegen.
