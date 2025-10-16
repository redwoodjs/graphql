---
description: Utility types exposed by Redwood
---

# Redwood Utility Types

Besides generating types for you, Redwood exposes a handful of utility types for Cells, Scenarios, and DbAuth.
You'll see these helpers quite often if you use the generators, so let's walk through some of them. By the end of this, you'll likely see a pattern in these types and their use of [Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html).

## Cells

Cells created using the generators come with all the types your normally need, including the `CellSuccessProps`, `CellFailureProps`, and `CellLoadingProps` utility types.

### `CellSuccessProps<TData, TVariables>`

This is used to type the props of your Cell's `Success` component.
It takes two arguments as generics:

| Generic      | Description                                                                              |
| :----------- | :--------------------------------------------------------------------------------------- |
| `TData`      | The type of data you're expecting to receive (usually the type generated from the query) |
| `TVariables` | An optional second parameter for the type of the query's variables                       |

Not only does `CellSuccessProps` type the data returned from the query, but it also types the variables and methods returned by Apollo Client's `useQuery` hook!

```ts title="web/src/components/BlogPostCell.tsx"
import type {
  FindBlogPostQuery,
  FindBlogPostQueryVariables,
} from 'types/graphql'

// highlight-next-line
import type { CellSuccessProps } from '@redwoodjs/web'

// ...

// highlight-next-line
type SuccessProps = CellSuccessProps<
  FindBlogPostQuery,
  FindBlogPostQueryVariables
>

export const Success = ({
  blogPost, // From the query. This is typed of course
  queryResult, // 👈 From Apollo Client. This is typed too!
  // highlight-next-line
}: SuccessProps) => {
  // ...
}
```

### `CellFailureProps<TVariables>`

This gives you the types of the props in your Cell's `Failure` component.
It takes `TVariables` as an optional generic parameter, which is useful if you want to print error messages like `"Couldn't load data for ${variables.searchTerm}"`:

```ts title="web/src/components/BlogPostCell.tsx"
import type { FindBlogPostQuery, FindBlogPostQueryVariables } from 'types/graphql'

// highlight-next-line
import type { CellFailureProps } from '@redwoodjs/web'

// ...

export const Failure = ({
  error,
  variables // 👈 Variables is typed based on the generic
  // highlight-next-line
}: CellFailureProps<FindBlogPostQueryVariables>) => (
  // ...
)
```

### `CellLoadingProps<TVariables>`

Similar to `CellFailureProps`, but for the props of your Cell's `Loading` component:

```ts title="web/src/components/BlogPostCell.tsx"
import type { FindBlogPostQuery, FindBlogPostQueryVariables } from 'types/graphql'

// highlight-next-line
import type { CellLoadingProps } from '@redwoodjs/web'

// ...

// highlight-next-line
export const Loading = (props: CellLoadingProps<FindBlogPostQueryVariables>) => (
  <div>Loading...</div>
)
```

## Scenarios & Testing

Over on the api side, when you generate SDLs and Services, Redwood generates tests and scenarios with all the types required. Let's take a deeper look at scenario types.

### `defineScenario`

This is actually a function, not a type, but it takes a lot of generics. Use as many or as few as you find helpful.

```
defineScenario<PrismaCreateType, TName, TKey>
```

| Generic            | Description                                                                                           |
| :----------------- | :---------------------------------------------------------------------------------------------------- |
| `PrismaCreateType` | (Optional) the type imported from Prisma's create operation that goes into the "data" key             |
| `TName`            | (Optional) the name or names of the models in your scenario                                           |
| `TKeys`            | (Optional) the key(s) in your scenario. These are really only useful while you write out the scenario |

An example:

```ts title="posts.scenarios.ts"
import type { Prisma, Post } from '@prisma/client'

export const standard = defineScenario<Prisma.PostCreateArgs, 'post', 'one'>({
  //👇 TName
  post: {
    // 👇 TKey
    one: {
      // 👇 PrismaCreateType. Notice how we import the type from @prisma/client
      data: { title: 'String', body: 'String', metadata: { foo: 'bar' } },
    },
  },
})
```

If you have more than one model in a single scenario, you can use unions:

```ts
defineScenario<Prisma.PostCreateArgs | Prisma.UserCreateArgs, 'post' | 'user'>
```

### `ScenarioData<TModel, TName, TKeys>`

This utility type makes it easy for you to access data created by your scenarios in your tests.
It takes three generic parameters:

| Generic | Description                                                                     |
| :------ | :------------------------------------------------------------------------------ |
| `TData` | The Prisma model that'll be returned                                            |
| `TName` | (Optional) the name of the model. ("post" in the example below)                 |
| `TKeys` | (optional) the key(s) used to define the scenario. ("one" in the example below) |

We know this is a lot of generics, but that's so you get to choose how specific you want to be with the types!

```ts title="api/src/services/posts/posts.scenario.ts"
import type { Post } from '@prisma/client'

//...

export type StandardScenario = ScenarioData<Post, 'post'>
```

```ts title="api/src/services/posts/posts.test.ts"
import type { StandardScenario } from './posts.scenarios'

scenario('returns a single post', async (scenario: StandardScenario) => {
  const result = await post({ id: scenario.post.one.id })
})
```

You can of course just define the type in the test file instead of importing it. Just be aware that if you change your scenario, you need to update the type in the test file too!

## DbAuth

When you setup dbAuth, the generated files in `api/src/lib/auth.ts` and `api/src/functions/auth.ts` have all the types you need. Let's break down some of the utility types.

### `DbAuthSession`

You'll notice an import at the top of `api/src/lib/auth.ts`:

```ts title="api/src/lib/auth.ts"
import type { DbAuthSession } from '@redwoodjs/api'
```

`DbAuthSession` is a utility type that's used to type the argument to `getCurrentUser`, `session`:

```ts title="api/src/lib/auth.ts"
export const getCurrentUser = async (session: DbAuthSession<number>) => {
  return await db.user.findUnique({
    where: { id: session.id },
    select: { id: true },
  })
}
```

The generic it takes should be the type of your User model's `id` field.
It's usually a `string` or a `number`, but it depends on how you've defined it.

Because a session only ever contains `id`, all we're doing here is defining the type of `id`.

### `DbAuthHandlerOptions`

`DbAuthHandlerOptions` gives you access to all the types you need to configure your dbAuth handler function in `api/src/function/auth.ts`.
It also takes a generic, `TUser`—the type of your User model. Note that this is not the same type as `CurrentUser`.

You can import the type of the User model directly from Prisma and pass it to `DbAuthHandlerOptions`:

```ts
import type { User as PrismaUser } from '@prisma/client'

import type { DbAuthHandlerOptions } from '@redwoodjs/api'

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
) => {
  // Pass in the generic to the type here 👇
  const forgotPasswordOptions: DbAuthHandlerOptions<PrismaUser>['forgotPassword'] =
    {
      // ...

      // Now in the handler function, `user` will be typed
      handler: (user) => {
        return user
      },

      // ...
    }

  // ...
}
```

Note that in strict mode, you'll likely see errors where the handlers expect "truthy" values. All you have to do is make sure you return a boolean. For example, `return !!user` instead of `return user`.

## Directives

### `ValidatorDirectiveFunc`

When you generate a [validator directive](directives.md#validators) you will see your `validate` function typed already with `ValidatorDirectiveFunc<TDirectiveArgs>`

```ts
import {
  createValidatorDirective,
  // highlight-next-line
  ValidatorDirectiveFunc,
} from '@redwoodjs/graphql-server'

export const schema = gql`
  directive @myValidator on FIELD_DEFINITION
`
// 👇 makes sure "context" and directive args are typed
// highlight-next-line
const validate: ValidatorDirectiveFunc = ({ context, directiveArgs }) => {
```

This type takes a single generic - the type of your `directiveArgs`.

Let's take a look at the built-in `@requireAuth(roles: ["ADMIN"])` directive, for example - which we ship with your Redwood app by default in `./api/src/directives/requireAuth/requireAuth.ts`

```ts
// highlight-next-line
type RequireAuthValidate = ValidatorDirectiveFunc<{ roles?: string[] }>

const validate: RequireAuthValidate = ({ directiveArgs }) => {
  // roles 👇 will be typed correctly as string[] | undefined
  // highlight-next-line
  const { roles } = directiveArgs
  // ....
}
```

| Generic          | Description                                               |
| :--------------- | :-------------------------------------------------------- |
| `TDirectiveArgs` | The type of arguments passed to your directive in the SDL |

### `TransformerDirectiveFunc`

When you generate a [transformer directive](directives.md#transformers) you will see your `transform` function typed with `TransformDirectiveFunc<TField, TDirectiveArgs>`.

```ts
// 👇 makes sure the functions' arguments are typed
// highlight-next-line
const transform: TransformerDirectiveFunc = ({ context, resolvedValue }) => {
```

This type takes two generics - the type of the field you are transforming, and the type of your `directiveArgs`.

So for example, let's say you have a transformer directive `@maskedEmail(permittedRoles: ['ADMIN'])` that you apply to `String` fields. You would pass in the following types

```ts
type MaskedEmailTransform = TransformerDirectiveFunc<
  string,
  { permittedRoles?: string[] }
>
```

| Generic          | Description                                                                    |
| :--------------- | :----------------------------------------------------------------------------- |
| `TField`         | This will type `resolvedValue` i.e. the type of the field you are transforming |
| `TDirectiveArgs` | The type of arguments passed to your directive in the SDL                      |
