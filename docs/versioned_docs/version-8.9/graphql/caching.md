# GraphQL Caching

## Client Caching

Apollo Client stores the results of your GraphQL queries in a local, normalized, in-memory cache.

Redwood provides a custom hook called `useCache` that makes it more convenience to access and use the cache object.

Please refer to Apollo's documentation for complete information about [Caching in Apollo Client](https://www.apollographql.com/docs/react/caching/overview).

### useCache Hook

`useCache` is a custom hook that returns the cache object and some useful methods to interact with the cache.

```ts title="Example of useCache() hook"
import { useCache } from '@redwoodjs/web/apollo'

const CacheExample = () => {
  const { cache, evict, extract, identify, modify, resetStore, clearStore } =
    useCache()

  // ...
}
```

### Helper Methods

#### cache

The cache object itself.

With `cache` you can access methods on the cache not exposed as helpers here, such as `readQuery` or `gc` for garbage collections. See Apollo's [caching interaction](https://www.apollographql.com/docs/react/caching/cache-interaction) documentation.

:::tip
To help understand the structure of your cached data, you can install the [Apollo Client Devtools](https://www.apollographql.com/docs/react/development-testing/developer-tooling/#apollo-client-devtools).

This browser extension includes an inspector that enables you to view all of the normalized objects contained in your cache.
:::

Alternatively, see [extract](#extract) to get a normalized cache object you can inspect.

#### evict

Either removes a normalized object from the cache or removes a specific field from a normalized object in the cache.

```ts title="Example of evict"
import { useCache } from '@redwoodjs/web/apollo'

const CacheExample = () => {
  const { evict } = useCache()

  // You can remove any normalized object from the cache using the evict method:
  evict({ id: 'Post:123' })

  // You can also remove a single field from a cached object by providing the name of the field to remove
  evict({ id: 'Post:123', fieldName: 'title' })
}
```

#### extract

Returns a serialized representation of the cache's current contents

```ts title="Example of extract"
import { useCache } from '@redwoodjs/web/apollo'

const CacheExample = () => {
  const { extract } = useCache()

  console.log(extract())
}
```

#### identify

If a type in your cache uses a custom cache ID (or even if it doesn't), you can use the `cache.identify` method to obtain the cache ID for an object of that type.

This method takes an object and computes its ID based on both its `__typename` and its identifier field(s).

This means you don't have to keep track of which fields make up each type's cache ID.

```ts title="Example of identify"
import { useCache } from '@redwoodjs/web/apollo'

const CacheExample = () => {
  const { identify } = useCache()

  const id = identify({ __typename: 'User', id: 1 })

  console.log(id)
}
```

#### modify

Modifies one or more field values of a cached object.

You must provide a modifier function for each field to modify. A modifier function takes a cached field's current value and returns the value that should replace it.

Returns `true` if the cache was modified successfully and `false` otherwise.

```ts title="Example of modify"
import { useCache } from '@redwoodjs/web/apollo'

const CacheExample = () => {
  const { modify } = useCache()

  const id = identify({ __typename: 'User', id: 1 })

  modify(id, {
    name: 'David',
  })
}
```

#### resetStore

Reset the cache entirely, such as when a user logs out.

See Apollo's [Resetting the Cache](https://www.apollographql.com/docs/react/caching/advanced-topics#resetting-the-cache) for more details.

```ts title="Example of resetStore"
import { useCache } from '@redwoodjs/web/apollo'

const Logout = () => {
  const { resetStore } = useCache()

  return (
    <button onClick={() => resetStore()}>
      Log out
    </button>
  )
}
```

#### clearStore

To reset the cache without refetching active queries, use `clearStore`.

See Apollo's documentation on [Resetting the Cache](https://www.apollographql.com/docs/react/caching/advanced-topics#resetting-the-cache) for more details.

```ts title="Example of clearStore"
import { useCache } from '@redwoodjs/web/apollo'

const Logout = () => {
  const { clearStore } = useCache()

  return (
    <button onClick={() => clearStore()}>
      Log out
    </button>
  )
}
```

### Persisting Cache

Apollo Client allows you [persist and rehydrate](https://www.apollographql.com/docs/react/caching/advanced-topics/#persisting-the-cache) the `InMemoryCache` from a storage provider like `AsyncStorage` or `localStorage`. To do so, use the `apollo3-cache-persist` package. This package works with a variety of storage providers.

To get started, pass your `cache` from the `useCache` hook and a storage provider to `persistCache`. By default, the contents of your cache are immediately restored asynchronously, and they're persisted on every write to the cache with a short, configurable debounce interval.

:::note

The persistCache method is async and returns a Promise.

:::

```jsx title="Example of persisting cache"
import { persistCache, LocalStorageWrapper } from 'apollo3-cache-persist'

import { useCache } from '@redwoodjs/web/apollo'

const PersistCacheExample = async () => {
  const { cache } = useCache()

  await persistCache({
    cache,
    storage: new LocalStorageWrapper(window.localStorage),
  })

  // ...
}
```

## Response Caching

[Response caching](https://the-guild.dev/graphql/yoga-server/docs/features/response-caching) is a technique for reducing server load by caching GraphQL query operation results. For incoming GraphQL Query operations with the same variable values, the same response is returned from a cache instead of executed again.

Redwood's GraphQL Server offers response caching via the `useResponseCache` [GraphQL Yoga plugin](https://github.com/dotansimha/graphql-yoga/tree/main/packages/plugins/response-cache).

### Setup

To setup response caching, first install `@graphql-yoga/plugin-response-cache`:

```bash
yarn workspace api add @graphql-yoga/plugin-response-cache
```

And then modify your `api/src/functions/graphql.ts` function to add (and configure) the `useResponseCache` plugin to the handler's `extraPlugins`:

```ts title="Example of GraphQL Response Caching"
import { useResponseCache } from '@graphql-yoga/plugin-response-cache'

import { createGraphQLHandler } from '@redwoodjs/graphql-server'

import directives from 'src/directives/**/*.{js,ts}'
import sdls from 'src/graphql/**/*.sdl.{js,ts}'
import services from 'src/services/**/*.{js,ts}'

import { db } from 'src/lib/db'
import { logger } from 'src/lib/logger'

export const handler = createGraphQLHandler({
  loggerConfig: { logger, options: {} },
  directives,
  sdls,
  services,
  extraPlugins: [
    useResponseCache({
      session: () => null,
      ttlPerSchemaCoordinate: {
        'Query.recentPosts': 10 * 1_000, // cache the `recentPosts` query for 10 seconds
      },
    }),
  ],
  onException: () => {
    // Disconnect from your database with an unhandled exception.
    db.$disconnect()
  },
})
```

### In-Memory vs External Caching

By default, the response cache stores all the cached query results in memory. That means if you have deployed to a serverless hosting platform, the cache only lives per-request.

In this case you would want to use an [External Cache](https://the-guild.dev/graphql/yoga-server/docs/features/response-caching#external-cache) like Redis.
