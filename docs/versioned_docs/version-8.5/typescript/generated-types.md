---
description: A look at automatic type generation in Redwood
---

# Generated Types

To add to the TypeScript (and JavaScript!) experience, Redwood generates types for you.
These generated types not only include your GraphQL operations, but also your named routes, Cells, scenarios, and tests.

When you run `yarn rw dev`, the CLI watches files for changes and triggers type generation automatically, but you can trigger it manually too:

```shell
yarn rw g types
# or
# yarn redwood generate types
```

:::tip Getting errors trying to generate types?

If you're getting errors trying to generate types, it's worth checking the GraphQL operations in your Cells and SDLs.
Make sure that they're syntactically valid, and that every query and mutation on the web side is defined in an `*.sdl.js` file on the api side.

:::

If you're curious, you can find the generated types in the `.redwood/types`, `web/types/graphql.d.ts`, and `api/types/graphql.d.ts` directories. Broadly speaking, Redwood generates the following types:

1. ["mirror" types](https://www.typescriptlang.org/docs/handbook/module-resolution.html#virtual-directories-with-rootdirs) for your components, pages, layouts, etc. on the web side, and for your services, lib, etc. on the api side
2. types based on your queries and mutations on the web side (in `web/types/graphql.d.ts`)
3. types for resolvers based on your SDLs on the api side (in `api/types/graphql.d.ts`)
4. types for testing, `currentUser`, etc.
5. types for certain functions like `routes.pageName()` and `useAuth()`

## CurrentUser

If you've setup auth, the type for the current user on both the web and the api side gets automatically "inferred" from the `getCurrentUser` function in `api/src/lib/auth.ts`.

For example, if you specify the return type on `getCurrentUser` as...

```ts title="api/src/lib/auth.ts"
interface MyCurrentUser {
  id: string
  roles: string[]
  email: string
  projectId: number
}

const getCurrentUser = ({ decoded }): MyCurrentUser => {
  //..
}
```

The types for both `useAuth().currentUser` on the web side and `context.currentUser` on the api side will be the same—the `MyCurrentUser` interface.

:::info Type of `context.currentUser` unknown?
This usually happens when you don't have the various generated and utility types in your project.
Run `yarn rw g types`, and just to be sure, restart your TS server.
In VSCode, you can do this by running "TypeScript: Restart TS server" in the command palette (Cmd+Shift+P on Mac, Ctrl+Shift+P on Windows)
:::

## Query and Mutation types

Let's say you have a query in a Cell that looks like this:

```js title="web/src/components/BlogPostCell.tsx"
export const QUERY = gql`
  # 👇 Make sure to name your GraphQL operations
  query FindBlogPostQuery($id: Int!) {
    blogPost: post(id: $id) {
      title
      body
    }
  }
`
```

Redwood generates types for both the data returned from the query and the query's variables.
These generated types will use the query's name—in this case, `FindBlogPostQuery`—so you can import them like this:

```ts title="web/src/components/BlogPostCell.tsx"
import type {
  FindBlogPostQuery,
  FindBlogPostQueryVariables,
} from 'types/graphql'
```

`FindBlogPostQuery` is the type of the data returned from the query (`{ title: string, body: string }`) and `FindBlogPostQueryVariables` is the type of the query's variables (`{ id: number }`).

The import statement's specifier, `'types/graphql'`, is a [mapped path](https://www.typescriptlang.org/docs/handbook/module-resolution.html#path-mapping). First, TypeScript will look for the types in `web/types/graphql.d.ts`; if they're not there, it'll check `types/graphql.d.ts`. Redwood only automatically generates the former. For the latter, see [sharing types between sides](./introduction.md#sharing-types-between-sides).

But don't worry too much. If you use the generators, they template all of this for you!

## Resolver Types

Generated Services include types for query and mutation resolvers:

```ts title="api/src/services/posts.ts"
// highlight-next-line
import type { QueryResolvers, MutationResolvers } from 'types/graphql'

import { db } from 'src/lib/db'

// highlight-next-line
export const posts: QueryResolvers['posts'] = () => {
  return db.post.findMany()
}

// highlight-next-line
export const post: QueryResolvers['post'] = ({ id }) => {
  return db.post.findUnique({
    where: { id },
  })
}
```

These types help you by making sure you're returning an object in the shape of what you've defined in your SDL. If your Prisma model name matches the SDL type name, it'll be "mapped" i.e. the resolvers will expect you to return the Prisma type.

Note that these types expect you to return the _complete_ type that you've defined in your Prisma schema. But you can just return the result of the Prisma query, and not have to worry about how, for example, a DateTime in Prisma maps to a String in GraphQL.

If the type doesn't match your Prisma models (by name), the TypeScript type will be generated based only on your definition in the SDL. So if you wish to return other properties that don't exist in your Prisma model type i.e. augment the prisma type with additional fields, you can change the type to a custom one in your SDL.

The resolver types help you by making sure you're returning an object in the shape of what you've defined in your SDL.

:::note A note on union types

Lets say that in one of your SDLs, you define a union type

```graphql
type OutOfStock {
  message: String!
}

// highlight-next-line
union CandyResult = Candy | OutOfStock

type Query {
  candy(id: String!): CandyResult @skipAuth
}
```

These types will also be handled automatically. But if you're returning a different Prisma model (instead of something like the generic `OutOfStock` type we have here, which is just a message), you may need to write your own resolver type, as the type generator won't know how to map the Prisma type to the GraphQL return type.

:::

## Under the Hood

Redwood uses [GraphQL Code Generator](https://www.graphql-code-generator.com) (aka graphql-codegen) to generate types for your GraphQL operations and SDLs. It's even configured to use the types from your generated Prisma Client, to make sure that your resolvers are strongly typed!

### Customizing GraphQL Code Generation

While the default settings are configured so that things just work️, you can customize them to your liking by adding a `./codegen.yml` file to the root of your project.

:::info Curious about the defaults?

You can find them [here](https://github.com/redwoodjs/redwood/blob/main/packages/internal/src/generate/graphqlCodeGen.ts) in Redwood's source. Look for the `generateTypeDefGraphQLWeb` and `generateTypeDefGraphQLApi` functions.

:::

For example, adding this `codegen.yml` to the root of your project will transform the names of the generated types to UPPERCASE:

```yml title="codegen.yml"
config:
  namingConvention:
    typeNames: change-case-all#upperCase
```

You can configure graphql-codegen in a number of different ways: `codegen.yml`, `codegen.json`, or `codegen.js`. Even a `codegen` key in your root `package.json` will do. graphql-codegen uses [cosmiconfig](https://github.com/davidtheclark/cosmiconfig#cosmiconfig) under the hood—take a look at their docs if you want to know more.

For completeness, [here's the docs](https://www.graphql-code-generator.com/docs/config-reference/config-field) on configuring GraphQL Code Generator. Currently, Redwood only supports the root level `config` option.

## Experimental SDL Code Generation

There is also an experimental code generator based on [sdl-codegen](https://github.com/sdl-codegen/sdl-codegen) available. sdl-codegen is a fresh implementation of code generation for service files, built with Redwood in mind. It is currently in opt-in and can be enabled by setting the `experimentalSdlCodeGen` flag to `true` in your `redwood.toml` file:

```toml title="redwood.toml"
[experimental]
  useSDLCodeGenForGraphQLTypes = true
```

Running `yarn rw g types` will generate types for your resolvers on a per-file basis, this feature can be paired with the optional eslint auto-fix rule to have types automatically applied to your resolvers in TypeScript service files by editing your root `package.json` with:

```diff title="package.json"
   "eslintConfig": {
     "extends": "@redwoodjs/eslint-config",
     "root": true,
     "parserOptions": {
       "warnOnUnsupportedTypeScriptVersion": false
     },
+    "overrides": [
+      {
+        "files": [
+          "api/src/services/**/*.ts"
+        ],
+        "rules": {
+          "@redwoodjs/service-type-annotations": "error"
+        }
+      }
     ]
   },
```

:::tip Using VSCode?

As a part of type generation, the extension [GraphQL: Language Feature Support](https://marketplace.visualstudio.com/items?itemName=GraphQL.vscode-graphql) configures itself based on the merged schema Redwood generates in `.redwood/schema.graphql`.
You can configure it further in `graphql.config.js` at the root of your project.

:::
