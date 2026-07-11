import {
  createCache,
  InMemoryClient,
  RedisClient,
} from '@redwoodjs/api/cache'

import { logger } from './logger'

export let client: InMemoryClient | RedisClient

if (process.env.NODE_ENV === 'test') {
  client = new InMemoryClient()
} else {
  try {
    client = new RedisClient({ url: process.env.CACHE_HOST, logger })
  } catch (e) {
    logger.error(`Could not connect to cache: ${e.message}`)
  }
}

export const { cache, cacheFindMany, cacheClient, deleteCacheKey } = createCache(client, {
  logger,
  timeout: 500,
})
