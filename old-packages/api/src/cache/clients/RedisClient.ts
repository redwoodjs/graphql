import type { RedisClientType, RedisClientOptions } from 'redis'

import type { Logger } from '../../logger'

import BaseClient from './BaseClient'

interface SetOptions {
  EX?: number
}

type LoggerOptions = {
  logger?: Logger
}

export default class RedisClient extends BaseClient {
  client?: RedisClientType | null
  logger?: Logger
  redisOptions?: RedisClientOptions

  constructor(options: RedisClientOptions & LoggerOptions) {
    const { logger, ...redisOptions } = options
    super()

    this.logger = logger
    this.redisOptions = redisOptions
  }

  async connect() {
    // async import to make sure Redis isn't imported for MemCache
    const { createClient } = await import('redis')

    // NOTE: type in redis client does not match the return type of createClient
    this.client = createClient(this.redisOptions) as RedisClientType
    this.client.on(
      'error',
      (err: Error) => this.logger?.error(err) || console.error(err),
    )

    await this.client.connect()
  }

  // @NOTE: disconnect intentionally not implemented for Redis
  // Because node-redis recovers gracefully from connection loss

  async get(key: string) {
    if (!this.client) {
      await this.connect()
    }

    const result = await this.client?.get(key)

    return result ? JSON.parse(result) : null
  }

  async set(key: string, value: unknown, options: { expires?: number }) {
    const setOptions: SetOptions = {}

    if (!this.client) {
      await this.connect()
    }

    if (options.expires) {
      setOptions.EX = options.expires
    }

    return this.client?.set(key, JSON.stringify(value), setOptions)
  }

  async del(key: string) {
    if (!this.client) {
      await this.connect()
    }

    // Redis client returns 0 or 1, so convert to true/false manually
    return !!(await this.client?.del([key]))
  }
}
