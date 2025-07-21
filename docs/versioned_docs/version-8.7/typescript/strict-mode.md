---
description: TS Strict mode tips and tricks
---

# TypeScript Strict Mode

Looks like you're ready to level up your TypeScript game!
Redwood supports [strict mode](https://www.typescriptlang.org/docs/handbook/2/basic-types.html#strictness), but doesn't enable it by default.
While strict mode gives you a lot more safety, it makes your code a bit more verbose and requires you to make small manual changes if you use the generators.

## Enabling strict mode

Enable strict mode by setting `strict` to true in `web/tsconfig.json` and `api/tsconfig.json`, and if you're using scripts in `scripts/tsconfig.json`:

```json title="web/tsconfig.json, api/tsconfig.json, scripts/tsconfig.json"
{
  "compilerOptions": {
    "noEmit": true,
    "allowJs": true,
    // highlight-next-line
    "strict": true
    // ...
  }
  // ...
}
```

Redwood's type generator behaves a bit differently in strict mode, so now that you've opted in, make sure to generate types:

```
yarn rw g types
```

## Manual tweaks to generated code

Now that you're in strict mode, there are some changes you need to make to get rid of those pesky red underlines!

### `null` and `undefined` in Services

One of the challenges in the GraphQL-Prisma world is the difference in the way they treats optionals:

- for GraphQL, optional fields can be `null`
- but For Prisma, `null` is a value, and `undefined` means "do nothing"

This is covered in detail in [Prisma's docs](https://www.prisma.io/docs/concepts/components/prisma-client/null-and-undefined), which we strongly recommend reading.
But the gist of it is that, for Prisma's create and update operations, you may have to make sure `null`s are converted to `undefined` from your GraphQL mutation inputs. You'll have to think carefully about the behaviour you want - if the client is expected to send null, and you expect those fields to be set to null, you can make the field nullable in your Prisma schema. Sending a null will mean removing that value, sending undefined will mean that the field won't be updated.

For most cases however, you probably want to convert nulls to undefined - one way to do this is to use the `removeNulls` utility function from `@redwoodjs/api`:

```ts title="api/src/services/users.ts"
// highlight-next-line
import { removeNulls } from '@redwoodjs/api'

export const updateUser: MutationResolvers['updateUser'] = ({ id, input }) => {
  return db.user.update({
    // highlight-next-line
    data: removeNulls(input),
    where: { id },
  })
}
```

### Relation resolvers in services

Let's say you have a `Post` model in your `schema.prisma` that has an `author` field which is a relation to the `Author` model. It's a required field.
This is what the `Post` model's SDL would probably look like:

```graphql post.sdl.ts
export const schema = gql`
  type Post {
    id: Int!
    title: String!
    // highlight-next-line
    author: Author! # 👈 This is a relation; the `!` makes it a required field
    authorId: Int!
    # ...
  }
```

When you generate SDLs or Services, the resolver for `author` is generated at the bottom of `post.service.ts` on the `Post` object.
Because `Post.author` can't be null (we said it's required in the Prisma schema)—and because `findUnique` always returns a nullable value—in strict mode, you'll have to tweak this resolver:

```ts Post.service.ts
// Option 1: Override the type
// The typecasting here is OK. `root` is the post that was _already found_
// by the `post` function in your Services, so `findUnique` will always find it!
export const Post: PostRelationResolvers = {
  author: (_obj, { root }) =>
    db.post.findUnique({ where: { id: root?.id } }).author() as Promise<Author>, // 👈
}

// Option 2: Check for null
export const Post: PostRelationResolvers = {
  author: async (_obj, { root }) => {
    // Here, `findUnique` can return `null`, so we have to handle it:
    const maybeAuthor = await db.post
      .findUnique({ where: { id: root?.id } })
      .author()

    // highlight-start
    if (!maybeAuthor) {
      throw new Error('Could not resolve author')
    }
    // highlight-end

    return maybeAuthor
  },
}
```

:::tip An optimization tip

If the relation truly is required, it may make more sense to include `author` in your `post` Service's Prisma query and modify the `Post.author` resolver accordingly:

```ts
export const post: QueryResolvers['post'] = ({ id }) => {
  return db.post.findUnique({
    // highlight-start
    include: {
      author: true,
    },
    // highlight-end
    where: { id },
  })
}

export const Post: PostRelationResolvers = {
  author: async (_obj, { root }) => {
   // highlight-start
    if (root.author) {
      return root.author
    }
  // highlight-end

  const maybeAuthor = await db.post.findUnique(// ...
```

This will also help Prisma make a more optimized query to the database, since every time a field on `Post` is requested, the post's author is too! The tradeoff here is that any query to `Post` (even if the author isn't requested) will mean an unnecessary database query to include the author.

:::

### Roles checks for CurrentUser in `src/lib/auth`

When you setup auth, Redwood includes some template code for handling roles with the `hasRole` function.
While Redwood does runtime checks to make sure it doesn't access roles if it doesn't exist, TypeScript in strict mode will highlight errors, depending on whether you are returning `roles`, and whether those roles are `string` or `string[]`

```typescript
export const hasRole = (roles: AllowedRoles): boolean => {
  if (!isAuthenticated()) {
    return false
  }

  // highlight-next-line
  const currentUserRoles = context.currentUser?.roles
  // Error: Property 'roles' does not exist on type '{ id: number; }'.ts(2339)
```

You'll have to adjust the generated code depending on your User model.

<details>
<summary>Example code diffs</summary>

#### A. If your project does not use roles

If your `getCurrentUser` doesn't return `roles`, and you don't use this functionality, you can safely remove the `hasRole` function.

#### B. Roles on current user is a string

Alternatively, if you define the roles as a string, you can remove the code that does checks against Arrays

```diff title="api/src/lib/auth.ts"
export const hasRole = (roles: AllowedRoles): boolean => {
  if (!isAuthenticated()) {
    return false
  }

  const currentUserRoles = context.currentUser?.roles

  if (typeof roles === 'string') {
-    if (typeof currentUserRoles === 'string') {
      return currentUserRoles === roles
-    }
  }

  if (Array.isArray(roles)) {
-    if (Array.isArray(currentUserRoles)) {
-      return currentUserRoles?.some((allowedRole) =>
-        roles.includes(allowedRole)
-      )
-    } else if (typeof currentUserRoles === 'string') {
      // roles to check is an array, currentUser.roles is a string
      return roles.some((allowedRole) => currentUserRoles === allowedRole)
-    }
  }

  // roles not found
  return false
}
```

#### C. Roles on current user is an Array of strings

If in your User model, roles are an array of strings, and can never be just a string, you can safely remove most of the code

```diff title="api/src/lib/auth.ts"
export const hasRole = (roles: AllowedRoles): boolean => {
  if (!isAuthenticated()) {
    return false
  }

 const currentUserRoles = context.currentUser?.roles

  if (typeof roles === 'string') {
-    if (typeof currentUserRoles === 'string') {
-      return currentUserRoles === roles
-    } else if (Array.isArray(currentUserRoles)) {
      // roles to check is a string, currentUser.roles is an array
      return currentUserRoles?.some((allowedRole) => roles === allowedRole)
-    }
  }

  if (Array.isArray(roles)) {
-    if (Array.isArray(currentUserRoles)) {
      return currentUserRoles?.some((allowedRole) =>
        roles.includes(allowedRole)
      )
-    } else if (typeof currentUserRoles === 'string') {
-      return roles.some(
-        (allowedRole) => currentUserRoles === allowedRole
-      )
    }
  }

  // roles not found
  return false
}
```

</details>

### `getCurrentUser` in `api/src/lib/auth.ts`

Depending on your auth provider—i.e., anything but dbAuth—because it could change based on your account settings (if you include roles or other metadata), we can't know the shape of your decoded token at setup time.
So you'll have to make sure that the `getCurrentUser` function is typed.

To help you get started, the comments above the `getCurrentUser` function describe its parameters' types. We recommend typing `decoded` without using imported types from Redwood, as this may be a little too generic!

```ts title='api/src/lib/auth.ts'
import type { AuthContextPayload } from '@redwoodjs/api'

// Example 1: typing directly
export const getCurrentUser: CurrentUserFunc = async (
  decoded: { id: string; name: string },
  { token, type }: { token: string; type: string }
) => {
  // ...
}

// Example 2: Using AuthContextPayload
export const getCurrentUser: CurrentUserFunc = async (
  decoded: { id: string; name: string },
  { token, type }: AuthContextPayload[1],
  { event, context }: AuthContextPayload[2]
) => {
  // ...
}
```
