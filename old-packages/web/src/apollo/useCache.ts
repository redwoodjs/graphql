import type { ApolloCache, Reference, StoreObject } from '@apollo/client'
import type { NormalizedCacheObject } from '@apollo/client/cache/inmemory/types.js'
import type { ApolloQueryResult } from '@apollo/client/core'
import { useApolloClient } from '@apollo/client/react/hooks/hooks.cjs'

type useCacheType = {
  cache: ApolloCache<object>
  evict: (object: StoreObject | Reference) => boolean
  extract: (optimistic?: boolean) => NormalizedCacheObject
  identify: (object: StoreObject | Reference) => { id: string | undefined }
  modify: (
    object: StoreObject | Reference,
    fields: Record<string, any>,
  ) => boolean
  resetStore: () => Promise<ApolloQueryResult<any>[] | null>
  clearStore: () => Promise<ApolloQueryResult<any>[] | null>
}

/**
 * Apollo Client stores the results of your GraphQL queries in a local, normalized, in-memory cache.
 *
 * useCache is a custom hook that returns the cache object and some useful methods to interact with the cache.
 */
export const useCache = (): useCacheType => {
  const client = useApolloClient()

  const cache = client.cache

  /**
   *  Returns a serialized representation of the cache's current contents
   */
  const extract = (optimistic = false): NormalizedCacheObject =>
    cache.extract(optimistic) as NormalizedCacheObject

  /**
   * If a type in your cache uses a custom cache ID (or even if it doesn't),
   * you can use the cache.identify method to obtain the cache ID for an object of that type.
   *
   * This method takes an object and computes its ID based on both its __typename and its identifier field(s).
   * This means you don't have to keep track of which fields make up each type's cache ID.
   *
   * @see https://www.apollographql.com/docs/react/caching/cache-interaction#obtaining-an-objects-cache-id
   */
  const identify = (
    object: StoreObject | Reference,
  ): { id: string | undefined } => {
    return { id: cache.identify(object) }
  }

  /**
   * Modifies one or more field values of a cached object.
   * Must provide a modifier function for each field to modify. A modifier function takes a cached field's current value and returns the value that should replace it.
   *
   * Returns true if the cache was modified successfully and false otherwise.
   *
   * @see https://www.apollographql.com/docs/react/caching/cache-interaction/#using-cachemodify
   */
  const modify = (
    object: StoreObject | Reference,
    fields: Record<string, any>,
  ): boolean => {
    return cache.modify({ ...identify(object), fields })
  }

  /**
   * Either removes a normalized object from the cache or removes a specific field from a normalized object in the cache.
   */
  const evict = (object: StoreObject | Reference): boolean => {
    return cache.evict(identify(object))
  }

  /**
   * Reset the cache entirely, such as when a user logs out.
   *
   * @see https://www.apollographql.com/docs/react/caching/advanced-topics#resetting-the-cache
   */
  const resetStore = () => {
    return client.resetStore()
  }

  /**
   * To reset the cache without refetching active queries, use the clearStore method.
   *
   * @see https://www.apollographql.com/docs/react/caching/advanced-topics#resetting-the-cache
   */
  const clearStore = () => {
    return client.clearStore()
  }

  return { cache, evict, extract, identify, modify, resetStore, clearStore }
}
