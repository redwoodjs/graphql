import { describe, it, expect } from 'vitest'

import InMemoryClient from '../clients/InMemoryClient'
import { createCache } from '../index'

describe('cache', () => {
  it('adds a missing key to the cache', async () => {
    const client = new InMemoryClient()
    const { cache } = createCache(client)

    const result = await cache('test', () => {
      return { foo: 'bar' }
    })

    expect(result).toEqual({ foo: 'bar' })
    expect(client.storage.test.value).toEqual(JSON.stringify({ foo: 'bar' }))
  })

  it('finds an existing key in the cache', async () => {
    const client = new InMemoryClient({
      test: { expires: 1977175194415, value: '{"foo":"bar"}' },
    })
    const { cache } = createCache(client)

    const result = await cache('test', () => {
      return { bar: 'baz' }
    })

    // returns existing cached value, not the one that was just set
    expect(result).toEqual({ foo: 'bar' })
  })
})
