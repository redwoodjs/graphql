import type { Logger } from '../logger'

import type BaseClient from './clients/BaseClient'
import { CacheTimeoutError } from './errors'

export { default as MemcachedClient } from './clients/MemcachedClient'
export { default as RedisClient } from './clients/RedisClient'
export { default as InMemoryClient } from './clients/InMemoryClient'

export interface CreateCacheOptions {
  logger?: Logger
  timeout?: number
  prefix?: string
  fields?: {
    id: string
    updatedAt: string
  }
}

export interface CacheOptions {
  expires?: number
}

export interface CacheFindManyOptions<
  TFindManyArgs extends Record<string, unknown>,
> extends CacheOptions {
  conditions?: TFindManyArgs
}

export type CacheKey = string | string[]
export type LatestQuery = Record<string, unknown>

type GenericDelegate = {
  findMany: (...args: any) => any
  findFirst: (...args: any) => any
}

const DEFAULT_LATEST_FIELDS = { id: 'id', updatedAt: 'updatedAt' }

const wait = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const cacheKeySeparator = '-'

export const formatCacheKey = (key: CacheKey, prefix?: string) => {
  let output

  if (Array.isArray(key)) {
    output = key.join(cacheKeySeparator)
  } else {
    output = key
  }

  // don't prefix if already prefixed
  if (
    prefix &&
    !output.toString().match(new RegExp('^' + prefix + cacheKeySeparator))
  ) {
    output = `${prefix}${cacheKeySeparator}${output}`
  }

  return output
}

const serialize = (input: any) => {
  return JSON.parse(JSON.stringify(input))
}

export const createCache = (
  cacheClient: BaseClient,
  options?: CreateCacheOptions,
) => {
  const client = cacheClient
  const logger = options?.logger
  const timeout = options?.timeout || 1000
  const prefix = options?.prefix
  const fields = options?.fields || DEFAULT_LATEST_FIELDS

  const cache = async <TResult>(
    key: CacheKey,
    input: () => TResult | Promise<TResult>,
    options?: CacheOptions,
  ): Promise<any> => {
    const cacheKey = formatCacheKey(key, prefix)

    try {
      // some client lib timeouts are flaky if the server actually goes away
      // (MemJS) so we'll implement our own here just in case
      const result = await Promise.race([
        client.get(cacheKey),
        wait(timeout).then(() => {
          throw new CacheTimeoutError()
        }),
      ])

      if (result) {
        logger?.debug(`[Cache] HIT key '${cacheKey}'`)
        return result
      }
    } catch (e: any) {
      logger?.error(`[Cache] Error GET '${cacheKey}': ${e.message}`)

      // If client implements a reconnect() function, try it now
      if (e instanceof CacheTimeoutError && client.disconnect) {
        logger?.error(`[Cache] Disconnecting current instance...`)

        await client.disconnect()
      }
      // stringify and parse to match what happens inside cache clients
      return serialize(await input())
    }

    // data wasn't found, SET it instead
    let data

    try {
      data = await input()

      await Promise.race([
        client.set(cacheKey, data, options || {}),
        wait(timeout).then(() => {
          throw new CacheTimeoutError()
        }),
      ])

      logger?.debug(
        `[Cache] MISS '${cacheKey}', SET ${JSON.stringify(data).length} bytes`,
      )
      return serialize(data)
    } catch (e: any) {
      logger?.error(`[Cache] Error SET '${cacheKey}': ${e.message}`)
      return serialize(data || (await input()))
    }
  }

  const cacheFindMany = async <TDelegate extends GenericDelegate>(
    key: CacheKey,
    model: TDelegate,
    options: CacheFindManyOptions<Parameters<TDelegate['findMany']>[0]> = {},
  ) => {
    const { conditions, ...rest } = options
    const cacheKey = formatCacheKey(key, prefix)
    let latest, latestCacheKey

    // @ts-expect-error - Error object is not exported until `prisma generate`
    const { PrismaClientValidationError } = await import('@prisma/client')

    // take the conditions from the query that's going to be cached, and only
    // return the latest record (based on `updatedAt`) from that set of
    // records, using its data as the cache key
    try {
      latest = await model.findFirst({
        ...conditions,
        orderBy: { [fields.updatedAt]: 'desc' },
        select: { [fields.id]: true, [fields.updatedAt]: true },
      })
    } catch (e: any) {
      if (e instanceof PrismaClientValidationError) {
        logger?.error(
          `[Cache] cacheFindMany error: model does not contain \`${fields.id}\` or \`${fields.updatedAt}\` fields`,
        )
      } else {
        logger?.error(`[Cache] cacheFindMany error: ${e.message}`)
      }

      return serialize(await model.findMany(conditions))
    }

    // there may not have been any records returned, in which case we can't
    // create the key so just return the query
    if (latest) {
      latestCacheKey = `${cacheKey}${cacheKeySeparator}${
        latest.id
      }${cacheKeySeparator}${latest[fields.updatedAt].getTime()}`
    } else {
      logger?.debug(
        `[Cache] cacheFindMany: No data to cache for key \`${key}\`, skipping`,
      )

      return serialize(await model.findMany(conditions))
    }

    // everything looks good, cache() this with the computed key
    return cache(latestCacheKey, () => model.findMany(conditions), rest)
  }

  const deleteCacheKey = async (key: CacheKey) => {
    let result
    const cacheKey = formatCacheKey(key, prefix)

    try {
      await Promise.race([
        (result = client.del(cacheKey)),
        wait(timeout).then(() => {
          throw new CacheTimeoutError()
        }),
      ])

      logger?.debug(`[Cache] DEL '${cacheKey}'`)
      return result
    } catch (e: any) {
      logger?.error(`[Cache] Error DEL '${cacheKey}': ${e.message}`)
      return false
    }
  }

  return {
    cache,
    cacheFindMany,
    cacheClient: client,
    deleteCacheKey,
  }
}
