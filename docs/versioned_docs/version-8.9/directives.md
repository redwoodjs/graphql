---
description: Customize GraphQL execution
---

# Directives

Redwood Directives are a powerful feature, supercharging your GraphQL-backed Services.

You can think of directives like "middleware" that let you run reusable code during GraphQL execution to perform tasks like authentication and formatting.

Redwood uses them to make it a snap to protect your API Services from unauthorized access.

Here we call those types of directives **Validators**.

You can also use them to transform the output of your query result to modify string values, format dates, shield sensitive data, and more!
We call those types of directives **Transformers**.

You'll recognize a directive as being 1) preceded by `@` (e.g. `@myDirective`) and 2) declared alongside a field:

```tsx
type Bar {
  name: String! @myDirective
}
```

or a Query or a Mutation:

```tsx
type Query {
  bars: [Bar!]! @myDirective
}

type Mutation {
  createBar(input: CreateBarInput!): Bar! @myDirective
}
```

You can also define arguments that can be extracted and used when evaluating the directive:

```tsx
type Bar {
  field: String! @myDirective(roles: ["ADMIN"])
}
```

or a Query or Mutation:

```tsx
type Query {
  bars: [Bar!]! @myDirective(roles: ["ADMIN"])
}
```

You can also use directives on relations:

```tsx
type Baz {
  name: String!
}

type Bar {
  name: String!
  bazzes: [Baz]! @myDirective
}
```

There are many ways to write directives using GraphQL tools and libraries. Believe us, it can get complicated fast.

But, don't fret: Redwood provides an easy and ergonomic way to generate and write your own directives so that you can focus on the implementation logic and not the GraphQL plumbing.

## What is a Redwood Directive?

Redwood directives are purposeful.
They come in two flavors: **Validators** and **Transformers**.

Whatever flavor of directive you want, all Redwood directives must have the following properties:

- be in the `api/src/directives/{directiveName}` directory where `directiveName` is the directive directory
- must have a file named `{directiveName}.{js,ts}` (e.g. `maskedEmail.ts`)
- must export a `schema` and implement either a `validate` or `transform` function

### Understanding the Directive Flow

Since it helps to know a little about the GraphQL phases—specifically the Execution phase—and how Redwood Directives fit in the data-fetching and authentication flow, let's have a quick look at some diagrams.

First, we see the built-in `@requireAuth` Validator directive that can allow or deny access to a Service (a.k.a. a resolver) based on Redwood authentication.
In this example, the `post(id: Int!)` query is protected using the `@requireAuth` directive.

If the request's context has a `currentUser` and the app's `auth.{js|ts}` determines it `isAuthenticated()`, then the execution phase proceeds to get resolved (for example, the `post({ id })` Service is executed and queries the database using Prisma) and returns the data in the resulting response when execution is done.

![require-auth-directive](https://user-images.githubusercontent.com/1051633/135320891-34dc06fc-b600-4c76-8a35-86bf42c7f179.png)

In this second example, we add the Transformer directive `@welcome` to the `title` field on `Post` in the SDL.

The GraphQL Execution phase proceeds the same as the prior example (because the `post` query is still protected and we'll want to fetch the user's name) and then the `title` field is resolved based on the data fetch query in the service.

Finally after execution is done, then the directive can inspect the `resolvedValue` (here "Welcome to the blog!") and replace the value by inserting the current user's name—"Welcome, Tom, to the blog!"

![welcome-directive](https://user-images.githubusercontent.com/1051633/135320906-5e2d639d-13a1-4aaf-85bf-98529822d244.png)

### Validators

Validators integrate with Redwood's authentication to evaluate whether or not a field, query, or mutation is permitted—that is, if the request context's `currentUser` is authenticated or belongs to one of the permitted roles.

Validators should throw an Error such as `AuthenticationError` or `ForbiddenError` to deny access and simply return to allow.

Here the `@isSubscriber` validator directive checks if the currentUser exists (and therefore is authenticated) and whether or not they have the `SUBSCRIBER` role. If they don't, then access is denied by throwing an error.

```tsx
import {
  AuthenticationError,
  ForbiddenError,
  createValidatorDirective,
  ValidatorDirectiveFunc,
} from '@redwoodjs/graphql-server'
import { hasRole } from 'src/lib/auth'

export const schema = gql`
  directive @isSubscriber on FIELD_DEFINITION
`

const validate: ValidatorDirectiveFunc = ({ context }) => {
  if (!context.currentUser) {
    throw new AuthenticationError("You don't have permission to do that.")
  }

  if (!context.currentUser.roles?.includes('SUBSCRIBER')) {
    throw new ForbiddenError("You don't have access to do that.")
  }
}

const isSubscriber = createValidatorDirective(schema, validate)

export default isSubscriber
```

Since validator directives can access arguments (such as `roles`), you can quickly provide RBAC (Role-based Access Control) to fields, queries and mutations.

```tsx
import gql from 'graphql-tag'

import { createValidatorDirective } from '@redwoodjs/graphql-server'

import { requireAuth as applicationRequireAuth } from 'src/lib/auth'
import { logger } from 'src/lib/logger'

export const schema = gql`
  directive @requireAuth(roles: [String]) on FIELD_DEFINITION
`

const validate = ({ directiveArgs }) => {
  const { roles } = directiveArgs

  applicationRequireAuth({ roles })
}

const requireAuth = createValidatorDirective(schema, validate)

export default requireAuth
```

All Redwood apps come with two built-in validator directives: `@requireAuth` and `@skipAuth`.
The `@requireAuth` directive takes optional roles.
You may use these to protect against unwanted GraphQL access to your data.
Or explicitly allow public access.

> **Note:** Validators evaluate prior to resolving the field value, so you cannot modify the value and any return value is ignored.

### Transformers

Transformers can access the resolved field value to modify and then replace it in the response.
Transformers apply to both single fields (such as a `User`'s `email`) and collections (such as a set of `Posts` that belong to `User`s) or is the result of a query. As such, Transformers cannot be applied to Mutations.

In the first case of a single field, the directive would return the modified field value. In the latter case, the directive could iterate each `Post` and modify the `title` in each. In all cases, the directive **must** return the same expected "shape" of the data the SDL expects.

> **Note:** you can chain directives to first validate and then transform, such as `@requireAuth @maskedEmail`. Or even combine transformations to cascade formatting a value (you could use `@uppercase` together with `@truncate` to uppercase a title and shorten to 10 characters).

Since transformer directives can access arguments (such as `roles` or `maxLength`) you may fetch those values and use them when applying (or to check if you even should apply) your transformation.

That means that a transformer directive could consider the `permittedRoles` in:

```tsx
type user {
  email: String! @maskedEmail(permittedRoles: ["ADMIN"])
}
```

and if the `currentUser` is an `ADMIN`, then skip the masking transform and simply return the original resolved field value:

```jsx title="./api/src/directives/maskedEmail.directive.js"
import { createTransformerDirective, TransformerDirectiveFunc } from '@redwoodjs/graphql-server'

export const schema = gql`
  directive @maskedEmail(permittedRoles: [String]) on FIELD_DEFINITION
`

const transform: TransformerDirectiveFunc = ({ context, resolvedValue }) => {
  return resolvedValue.replace(/[a-zA-Z0-9]/i, '*')
}

const maskedEmail = createTransformerDirective(schema, transform)

export default maskedEmail
```

and you would use it in your SDLs like this:

```graphql
type UserExample {
  id: Int!
  email: String! @maskedEmail # 👈 will replace alphanumeric characters with asterisks in the response!
  name: String
}
```

### Where can I use a Redwood Directive?

A directive can only appear in certain locations in a GraphQL schema or operation. These locations are listed in the directive's definition.

In the example below, the `@maskedEmail` example, the directive can only appear in the `FIELD_DEFINITION` location.

An example of a `FIELD_DEFINITION` location is a field that exists on a `Type`:

```graphql
type UserExample {
  id: Int!
  email: String! @requireAuth
  name: String @maskedEmail # 👈 will maskedEmail name in the response!
}

type Query {
 userExamples: [UserExample!]! @requireAuth 👈 will enforce auth when fetching all users
 userExamples(id: Int!): UserExample @requireAuth 👈 will enforce auth when fetching a single user
}
```

> **Note**: Even though GraphQL supports `FIELD_DEFINITION | ARGUMENT_DEFINITION | INPUT_FIELD_DEFINITION | ENUM_VALUE` locations, RedwoodDirectives can **only** be declared on a `FIELD_DEFINITION` — that is, you **cannot** declare a directive in an `Input type`:
>
> ```graphql
> input UserExampleInput {
>   email: String! @maskedEmail # 👈 🙅 not allowed on an input
>   name: String! @requireAuth # 👈 🙅 also not allowed on an input
> }
> ```

## When Should I Use a Redwood Directive?

As noted in the [GraphQL spec](https://graphql.org/learn/queries/#directives):

> Directives can be useful to get out of situations where you otherwise would need to do string manipulation to add and remove fields in your query. Server implementations may also add experimental features by defining completely new directives.

Here's a helpful guide for deciding when you should use one of Redwood's Validator or Transformer directives:

|     | Use                                                                                                              | Directive                                                                                                                                                               | Custom?                                                                                                               | Type         |
| --- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------ |
| ✅  | Check if the request is authenticated?                                                                           | `@requireAuth`                                                                                                                                                          | Built-in                                                                                                              | Validator    |
| ✅  | Check if the user belongs to a role?                                                                             | `@requireAuth(roles: ["AUTHOR"])`                                                                                                                                       | Built-in                                                                                                              | Validator    |
| ✅  | Only allow admins to see emails, but others get a masked value like "###@######.###"                             | `@maskedEmail(roles: ["ADMIN"])`                                                                                                                                        | Custom                                                                                                                | Transformer  |
| 🙅  | Know if the logged in user can edit the record, and/or values                                                    | N/A - Instead do this check in your service                                                                                                                             |
| 🙅  | Is my input a valid email address format?                                                                        | N/A - Instead do this check in your service using [Service Validations](services.md#service-validations) or consider [GraphQL Scalars](https://www.graphql-scalars.dev) |
| 🙅  | I want to remove a field from the response for data filtering; for example, do not include the title of the post | `@skip(if: true )` or `@include(if: false)`                                                                                                                             | Instead use [core directives](https://graphql.org/learn/queries/#directives) on the GraphQL client query, not the SDL | Core GraphQL |

## Combining, Chaining and Cascading Directives

Now that you've seen what Validator and Transformer directives look like and where and when you may use them, you may wonder: can I use them together? Can I transform the result of a transformer?

The answer is: yes—yes you can!

### Combine Directives on a Query and a Type Field

Let's say you want to only allow logged-in users to be able to query `User` details and you only want un-redacted email addresses to be shown to ADMINs.

You can apply the `@requireAuth` directive to the `user(id: Int!)` query so you have to be logged in.
Then, you can compose a `@maskedEmail` directive that checks the logged-in user's role membership and if they're not an ADMIN, mask the email address:

```tsx
  type User {
    id: Int!
    name: String!
    email: String! @maskedEmail(role: "ADMIN")
    createdAt: DateTime!
  }

  type Query {
    user(id: Int!): User @requireAuth
  }
```

Or, let's say I want to only allow logged in users to be able to query User details.

But, I only want ADMIN users to be able to query and fetch the email address.

I can apply the `@requireAuth` directive to the `user(id: Int!)` query so I have to be logged in.

And, I can apply the `@requireAuth` directive to the `email` field with a role argument.

```tsx
  type User {
    id: Int!
    name: String!
    email: String! @requireAuth(role: "ADMIN")
    createdAt: DateTime!
  }

  type Query {
    user(id: Int!): User @requireAuth
  }
```

Now, if a user who is not an ADMIN queries:

```tsx
query user(id: 1) {
  id
  name
  createdAt
}
```

They will get a result.

But, if they try to query:

```tsx
query user(id: 1) {
  id
  name
  email
  createdAt
}
```

They will be forbidden from even making the request.

### Chaining a Validator and a Transformer

Similar to the prior example, you may want to chain directives, but the transform doesn't consider authentication or role membership.

For example, here we ensure that anyone trying to query a User and fetch the email must be authenticated.

And then, if they are, apply a mask to the email field.

```tsx
  type User {
    id: Int!
    name: String!
    email: String! @requireAuth @maskedEmail
    createdAt: DateTime!
  }
```

### Cascade Transformers

Maybe you want to apply multiple field formatting?

If your request event headers includes geographic or timezone info, you could compose a custom Transformer directive called `@localTimezone` could inspect the header value and convert the `createdAt` from UTC to local time -- something often done in the browser.

Then, you can chain the `@dateFormat` Transformer, to just return the date portion of the timestamp -- and not the time.

```tsx
  type User {
    id: Int!
    name: String!
    email: String!
    createdAt: DateTime! @localTimezone @dateFormat
  }
```

> **Note**: These directives could be alternatively be implemented as "operation directives" so the client can use them on a query instead of the schema-level. These such directives are a potential future Redwood directive feature.

## GraphQL Handler Setup

Redwood makes it easy to code, organize, and map your directives into your GraphQL schema.
Simply add them to the `directives` directory and the `createGraphQLHandler` does all the work.

You simply add them to the `directives` directory and the `createGraphQLHandler` will do all the work.

> **Note**: Redwood has a generator that will do all the heavy lifting setup for you!

```tsx title="api/src/functions/graphql.ts"
import { createGraphQLHandler } from '@redwoodjs/graphql-server'

import directives from 'src/directives/**/*.{js,ts}' // 👈 directives live here
import sdls from 'src/graphql/**/*.sdl.{js,ts}'
import services from 'src/services/**/*.{js,ts}'

import { db } from 'src/lib/db'
import { logger } from 'src/lib/logger'

export const handler = createGraphQLHandler({
  loggerConfig: { logger, options: {} },
  directives, //  👈 directives are added to the schema here
  sdls,
  services,
  onException: () => {
    // Disconnect from your database with an unhandled exception.
    db.$disconnect()
  },
})
```

## Secure by Default with Built-in Directives

By default, your GraphQL endpoint is open to the world.

That means anyone can request any query and invoke any Mutation.
Whatever types and fields are defined in your SDL is data that anyone can access.

But Redwood encourages being secure by default by defaulting all queries and mutations to have the `@requireAuth` directive when generating SDL or a service.
When your app builds and your server starts up, Redwood checks that **all** queries and mutations have `@requireAuth`, `@skipAuth` or a custom directive applied.

If not, then your build will fail:

```bash
✖ Verifying graphql schema...
Building API...
Cleaning Web...
Building Web...
Prerendering Web...
You must specify one of @requireAuth, @skipAuth or a custom directive for
- contacts Query
- posts Query
- post Query
- updatePost Mutation
- deletePost Mutation
```

or your server won't startup and you should see that "Schema validation failed":

```bash
gen | Generating TypeScript definitions and GraphQL schemas...
gen | 47 files generated
api | Building... Took 593 ms
api | [GQL Server Error] - Schema validation failed
api | ----------------------------------------
api | You must specify one of @requireAuth, @skipAuth or a custom directive for
api | - posts Query
api | - createPost Mutation
api | - updatePost Mutation
api | - deletePost Mutation
```

To correct, just add the appropriate directive to your queries and mutations.

If not, then your build will fail and your server won't startup.

### @requireAuth

It's your responsibility to implement the `requireAuth()` function in your app's `api/src/lib/auth.{js|ts}` to check if the user is properly authenticated and/or has the expected role membership.

The `@requireAuth` directive will call the `requireAuth()` function to determine if the user is authenticated or not.

```tsx title="api/src/lib/auth.ts"
// ...

export const isAuthenticated = (): boolean => {
  return true // 👈 replace with the appropriate check
}

// ...

export const requireAuth = ({ roles }: { roles: AllowedRoles }) => {
  if (isAuthenticated()) {
    throw new AuthenticationError("You don't have permission to do that.")
  }

  if (!hasRole({ roles })) {
    throw new ForbiddenError("You don't have access to do that.")
  }
}
```

> **Note**: The `auth.ts` file here is the stub for a new RedwoodJS app. Once you have setup auth with your provider, this will enforce a proper authentication check.

### @skipAuth

If, however, you want your query or mutation to be public, then simply use `@skipAuth`.

## Custom Directives

Want to write your own directive? You can of course!
Just generate one using the Redwood CLI; it takes care of the boilerplate and even gives you a handy test!

### Generators

When using the `yarn redwood generate` command,
you'll be presented with a choice of creating a Validator or a Transformer directive.

```bash
yarn redwood generate directive myDirective

? What type of directive would you like to generate? › - Use arrow-keys. Return to submit.
❯ Validator - Implement a validation: throw an error if criteria not met to stop execution
Transformer - Modify values of fields or query responses
```

> **Note:** You can pass the `--type` flag with either `validator` or `transformer` to create the desired directive type.

After picking the directive type, the files will be created in your `api/src/directives` directory:

```bash
  ✔ Generating directive file ...
    ✔ Successfully wrote file `./api/src/directives/myDirective/myDirective.test.ts`
    ✔ Successfully wrote file `./api/src/directives/myDirective/myDirective.ts`
  ✔ Generating TypeScript definitions and GraphQL schemas ...
  ✔ Next steps...

    After modifying your directive, you can add it to your SDLs e.g.:
     // example todo.sdl.js
     # Option A: Add it to a field
     type Todo {
       id: Int!
       body: String! @myDirective
     }

     # Option B: Add it to query/mutation
     type Query {
       todos: [Todo] @myDirective
     }
```

### Validator

Let's create a `@isSubscriber` directive that checks roles to see if the user is a subscriber.

```bash
yarn rw g directive isSubscriber --type validator
```

Next, implement your validation logic in the directive's `validate` function.

Validator directives don't have access to the field value, (i.e. they're called before resolving the value). But they do have access to the `context` and `directiveArgs`.
They can be async or sync.
And if you want to stop executing (because of insufficient permissions for example), throw an error.
The return value is ignored

An example of `directiveArgs` is the `roles` argument in the directive `requireAuth(roles: "ADMIN")`

```tsx
const validate: ValidatorDirectiveFunc = ({ context, directiveArgs }) => {
  // You can also modify your directive to take arguments
  // and use the directiveArgs object provided to this function to get values
  logger.debug(directiveArgs, 'directiveArgs in isSubscriber directive')

  throw new Error('Implementation missing for isSubscriber')
}
```

Here we can access the `context` parameter and then check to see if the `currentUser` is authenticated and if they belong to the `SUBSCRIBER` role:

```tsx title="/api/src/directives/isSubscriber/isSubscriber.ts"
// ...

const validate: ValidatorDirectiveFunc = ({ context }) => {
  if (!context.currentUser)) {
    throw new AuthenticationError("You don't have permission to do that.")
  }

  if (!context.currentUser.roles?.includes('SUBSCRIBER')) {
    throw new ForbiddenError("You don't have access to do that.")
  }
}
```

#### Writing Validator Tests

When writing a Validator directive test, you'll want to:

- ensure the directive is named consistently and correctly so the directive name maps properly when validating
- confirm that the directive throws an error when invalid. The Validator directive should always have a reason to throw an error

Since we stub out the `Error('Implementation missing for isSubscriber')` case when generating the Validator directive, these tests should pass.
But once you begin implementing the validate logic, it's on you to update appropriately.

```tsx
import { mockRedwoodDirective, getDirectiveName } from '@redwoodjs/testing/api'

import isSubscriber from './isSubscriber'

describe('isSubscriber directive', () => {
  it('declares the directive sdl as schema, with the correct name', () => {
    expect(isSubscriber.schema).toBeTruthy()
    expect(getDirectiveName(isSubscriber.schema)).toBe('isSubscriber')
  })

  it('has a isSubscriber throws an error if validation does not pass', () => {
    const mockExecution = mockRedwoodDirective(isSubscriber, {})

    expect(mockExecution).toThrowError(
      'Implementation missing for isSubscriber'
    )
  })
})
```

:::tip
If your Validator Directive is asynchronous, you can use `rejects` to handle the exception.

```ts
describe('isSubscriber directive', () => {
  it('has a isSubscriber throws an error if validation does not pass', async () => {
    const mockExecution = mockRedwoodDirective(isSubscriber, {})
    await expect(mockExecution()).rejects.toThrowError(
      'Implementation missing for isSubscriber'
    )
  })
})
```

:::

### Transformer

Let's create a `@maskedEmail` directive that checks roles to see if the user should see the complete email address or if it should be obfuscated from prying eyes:

```bash
yarn rw g directive maskedEmail --type transformer
```

Next, implement your validation logic in the directive's `transform` function.

Transformer directives provide `context` and `resolvedValue` parameters and run **after** resolving the value.
Transformer directives **must** be synchronous, and return a value.
You can throw an error, if you want to stop executing, but note that the value has already been resolved.

Take note of the `resolvedValue`:

```tsx
const transform: TransformerDirectiveFunc = ({ context, resolvedValue }) => {
  return resolvedValue.replace('foo', 'bar')
}
```

It contains the value of the field on which the directive was placed. Here, `email`.
So the `resolvedValue` will be the value of the email property in the User model, the "original value" so-to-speak.

When you return a value from the `transform` function, just return a modified value and that will be returned as the result and replace the `email` value in the response.

> 🛎️ **Important**
>
> You must return a value of the same type. So, if your `resolvedValue` is a `String`, return a `String`. If it's a `Date`, return a `Date`. Otherwise, your data will not match the SDL Type.

#### Writing Transformer Tests

When writing a Transformer directive test, you'll want to:

- ensure the directive is named consistently and correctly so the directive name maps properly when transforming
- confirm that the directive returns a value and that it's the expected transformed value

Since we stub out and mock the `mockedResolvedValue` when generating the Transformer directive, these tests should pass.

Here we mock the value `foo` and, since the generated `transform` function replaces `foo` with `bar`, we expect that after execution, the returned value will be `bar`.
But once you begin implementing the validate logic, it's on you to update appropriately.

```tsx
import { mockRedwoodDirective, getDirectiveName } from '@redwoodjs/testing/api'

import maskedEmail from './maskedEmail'

describe('maskedEmail directive', () => {
  it('declares the directive sdl as schema, with the correct name', () => {
    expect(maskedEmail.schema).toBeTruthy()
    expect(getDirectiveName(maskedEmail.schema)).toBe('maskedEmail')
  })

  it('has a maskedEmail implementation transforms the value', () => {
    const mockExecution = mockRedwoodDirective(maskedEmail, {
      mockedResolvedValue: 'foo',
    })

    expect(mockExecution()).toBe('bar')
  })
})
```

:::tip

If your Transformer Directive is asynchronous, you can use `resolves` to handle the result.

```ts
import maskedEmail from './maskedEmail'

describe('maskedEmail directive', () => {
  it('has a maskedEmail implementation transforms the value', async () => {
    const mockExecution = mockRedwoodDirective(maskedEmail, {
      mockedResolvedValue: 'foo',
    })

    await expect(mockExecution()).resolves.toBe('bar')
  })
})
```

:::
