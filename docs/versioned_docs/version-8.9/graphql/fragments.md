# Fragments

[GraphQL fragments](https://graphql.org/learn/queries/#fragments) are reusable units of GraphQL queries that allow developers to define a set of fields that can be included in multiple queries. Fragments help improve code organization, reduce duplication, and make GraphQL queries more maintainable. They are particularly useful when you want to request the same set of fields on different parts of your data model or when you want to share query structures across multiple components or pages in your application.

## What are Fragments?

Here are some key points about GraphQL fragments:

1. **Reusability**: Fragments allow you to define a set of fields once and reuse them in multiple queries. This reduces redundancy and makes your code more DRY (Don't Repeat Yourself).

2. **Readability**: Fragments make queries more readable by separating the query structure from the actual query usage. This can lead to cleaner and more maintainable code.

3. **Maintainability**: When you need to make changes to the requested fields, you only need to update the fragment definition in one place, and all queries using that fragment will automatically reflect the changes.

## Basic Usage

Here's a basic example of how you might use GraphQL fragments in developer documentation:

Let's say you have a GraphQL schema representing books, and you want to create a fragment for retrieving basic book information like title, author, and publication year.

```graphql
# Define a GraphQL fragment for book information
fragment BookInfo on Book {
  id
  title
  author
  publicationYear
}

# Example query using the BookInfo fragment
query GetBookDetails($bookId: ID!) {
  book(id: $bookId) {
    ...BookInfo
    description
    # Include other fields specific to this query
  }
}
```

In this example:

- We've defined a fragment called `BookInfo` that specifies the fields we want for book information.
- In the `GetBookDetails` query, we use the `...BookInfo` spread syntax to include the fields defined in the fragment.
- We also include additional fields specific to this query, such as `description`.

By using the `BookInfo` fragment, you can maintain a consistent set of fields for book information across different parts of your application without duplicating the field selection in every query. This improves code maintainability and reduces the chance of errors.

In developer documentation, you can explain the purpose of the fragment, provide examples like the one above, and encourage developers to use fragments to organize and reuse their GraphQL queries effectively.

## Using Fragments in RedwoodJS

RedwoodJS makes it easy to use fragments, especially with VS Code and Apollo GraphQL Client.

First, RedwoodJS instructs the VS Code GraphQL Plugin where to look for fragments by configuring the `documents` attribute of your project's `graphql.config.js`:

```js
// graphql.config.js

const { getPaths } = require('@redwoodjs/internal')

module.exports = {
  schema: getPaths().generated.schema,
  documents: './web/src/**/!(*.d).{ts,tsx,js,jsx}', // 👈 Tells VS Code plugin where to find fragments
}
```

Second, RedwoodJS automatically creates the [fragmentRegistry](https://www.apollographql.com/docs/react/data/fragments/#registering-named-fragments-using-createfragmentregistry) needed for Apollo to know about the fragments in your project without needing to interpolate their declarations.

Redwood exports ways to interact with fragments in the `@redwoodjs/web/apollo` package.

```
import { fragmentRegistry, registerFragment } from '@redwoodjs/web/apollo'
```

With `fragmentRegistry`, you can interact with the registry directly.

With `registerFragment`, you can register a fragment with the registry and get back:

```ts
{
  fragment, typename, getCacheKey, useRegisteredFragment
}
```

which can then be used to work with the registered fragment.

### Setup

`yarn rw setup graphql fragments`

See more in [cli commands - setup graphql fragments](../cli-commands.md#setup-graphql-fragments).

### registerFragment

To register a fragment, you can simply register it with `registerFragment`.

```ts
import { registerFragment } from '@redwoodjs/web/apollo'

registerFragment(gql`
  fragment BookInfo on Book {
    id
    title
    author
    publicationYear
  }
`)
```

This makes the `BookInfo` available to use in your query:

```ts
import type { GetBookDetails } from 'types/graphql'

import { useQuery } from '@redwoodjs/web'

import BookInfo from 'src/components/BookInfo'

const GET_BOOK_DETAILS = gql`
  query GetBookDetails($bookId: ID!) {
    book(id: $bookId) {
      ...BookInfo
      description
      # Include other fields specific to this query
    }
  }

...

const { data, loading} = useQuery<GetBookDetails>(GET_BOOK_DETAILS)

```

You can then access the book info from `data` and render:

```ts
{!loading  && (
  <div key={`book-id-${id}`}>
    <h3>Title: {data.title}</h3>
    <p>by {data.author} ({data.publicationYear})<>
  </div>
)}
```

### fragment

Access the original fragment you registered.

```ts
import { fragment } from '@redwoodjs/web/apollo'
```

### typename

Access typename of fragment you registered.

```ts
import { typename } from '@redwoodjs/web/apollo'
```

For example, with

```graphql
# Define a GraphQL fragment for book information
fragment BookInfo on Book {
  id
  title
  author
  publicationYear
}
```

the `typename` is `Book`.

### getCacheKey

A helper function to create the cache key for the data associated with the fragment in Apollo cache.

```ts
import { getCacheKey } from '@redwoodjs/web/apollo'
```

For example, with

```graphql
# Define a GraphQL fragment for book information
fragment BookInfo on Book {
  id
  title
  author
  publicationYear
}
```

the `getCacheKey` is a function where `getCacheKey(42)` would return `Book:42`.

:::tip
We describe how [cache keys and identifiers](./caching.md#identify) are used in more depth in the our [Apollo client cache](./caching.md#client-caching) documentation.
:::

### useRegisteredFragment

```ts
import { registerFragment } from '@redwoodjs/web/apollo'

const { useRegisteredFragment } = registerFragment()
// ...
```

A helper function relies on Apollo's [`useFragment` hook](https://www.apollographql.com/docs/react/data/fragments/#usefragment) in Apollo cache.

The useFragment hook represents a lightweight live binding into the Apollo Client Cache. It enables Apollo Client to broadcast specific fragment results to individual components. This hook returns an always-up-to-date view of whatever data the cache currently contains for a given fragment. useFragment never triggers network requests of its own.

This means that once the Apollo Client Cache has loaded the data needed for the fragment, one can simply render the data for the fragment component with its id reference.

Also, anywhere the fragment component is rendered will be updated with the latest data if any of `useQuery` with uses the fragment received new data.

```ts
import type { Book } from 'types/graphql'

import { registerFragment } from '@redwoodjs/web/apollo'

const { useRegisteredFragment } = registerFragment(
  gql`
    fragment BookInfo on Book {
      id
      title
      author
      publicationYear
    }
  `
)

const Book = ({ id }: { id: string }) => {
  const { data, complete } = useRegisteredFragment<Book>(id)

  return (
    complete && (
      <div key={`book-id-${id}`}>
        <h3>Title: {data.title}</h3>
        <p>by {data.author} ({data.publicationYear})<>
      </div>
    )
  )
}

export default Book
```

:::note
In order to use [fragments](#what-are-fragments) with [unions](./../graphql#unions) and interfaces in Apollo Client, you need to tell the client how to discriminate between the different types that implement or belong to a supertype.

Please see how to [generate possible types from fragments and union types](#possible-types-for-unions).
:::

## Possible Types for Unions

In order to use [fragments](#fragments) with [unions](#unions) and interfaces in Apollo Client, you need to tell the client how to discriminate between the different types that implement or belong to a supertype.

You pass a possibleTypes option to the InMemoryCache constructor to specify these relationships in your schema.

This object maps the name of an interface or union type (the supertype) to the types that implement or belong to it (the subtypes).

For example:

```ts
/// web/src/App.tsx

<RedwoodApolloProvider graphQLClientConfig={{
  cacheConfig: {
    possibleTypes: {
      Character: ["Jedi", "Droid"],
      Test: ["PassingTest", "FailingTest", "SkippedTest"],
      Snake: ["Viper", "Python"],
      Groceries: ['Fruit', 'Vegetable'],
    },
  },
}}>
```

To make this easier to maintain, RedwoodJS GraphQL CodeGen automatically generates `possibleTypes` so you can simply assign it to the `graphQLClientConfig`:

```ts
// web/src/App.tsx

import possibleTypes from 'src/graphql/possibleTypes'

// ...

const graphQLClientConfig = {
  cacheConfig: {
    ...possibleTypes,
  },
}

<RedwoodApolloProvider graphQLClientConfig={graphQLClientConfig}>
```

To generate the `src/graphql/possibleTypes` file, enable fragments in `redwood.toml`:

```toml title=redwood.toml
[graphql]
  fragments = true
```

## Testing, Storybook and Mock Data

When using fragments with test or Storybook, it is important that you define your mock data correctly.

By including the `__typename` and the GraphQL Type for the mocked data object, you ensure that Apollo Client will handle the information when working with the cache or fragments.

For example, consider the fragment `BookInfo` used by the query `GetBookDetails`.

```ts
import type { Book } from 'types/graphql'

import { registerFragment } from '@redwoodjs/web/apollo'

const { useRegisteredFragment } = registerFragment(gql`
  fragment BookInfo on Book {
    id
    title
    author
    publicationYear
  }
`)
```

```ts
import type { GetBookDetails } from 'types/graphql'

import { useQuery } from '@redwoodjs/web'

import BookInfo from 'src/components/BookInfo'

const GET_BOOK_DETAILS = gql`
  query GetBookDetails($bookId: ID!) {
    book(id: $bookId) {
      ...BookInfo
      description
      # Include other fields specific to this query
    }
  }
```

### Mock Data

To satisfy the query as well as the fragment needs your mock data should include the `Book` typename:

```ts
export const standard = {
  book: {
    __typename: 'Book' as const,
    id: 42,
    title: 'Ulysses',
    author: 'James Joyce',
    publicationYear: 1922,
    description:
      'The experiences of three Dubliners over the course of a single day, 16 June 1904.',
  },
}
```

If using [fragments](../graphql/fragments.md) it is important to include the `__typename` otherwise Apollo client will not be able to map the mocked data to the fragment attributes.

:::tip note

The `__typename: 'Book' as const` ensures that `'Book'` is considered to be a `type` and not a `string`.
:::
