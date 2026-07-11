import type { Client as ClientType, ClientOptions, ServerOptions } from 'memjs'

import BaseClient from './BaseClient'

export default class MemcachedClient extends BaseClient {
  client?: ClientType | null
  servers
  options

  constructor(servers: string, options?: ClientOptions & ServerOptions) {
    super()
    this.servers = servers
    this.options = options
  }

  async connect() {
    const { Client: MemCachedClient } = await import('memjs')
    this.client = MemCachedClient.create(this.servers, this.options)
  }

  async disconnect() {
    this.client?.close()
    this.client = null
  }

  async get(key: string) {
    if (!this.client) {
      await this.connect()
    }

    const result = await this.client?.get(key)

    if (result?.value) {
      return JSON.parse(result.value.toString())
    } else {
      return result?.value
    }
  }

  async set(key: string, value: unknown, options: { expires?: number }) {
    if (!this.client) {
      await this.connect()
    }

    return this.client?.set(key, JSON.stringify(value), options)
  }

  async del(key: string) {
    if (!this.client) {
      await this.connect()
    }

    // memcached returns true/false natively
    return this.client?.delete(key)
  }
}
