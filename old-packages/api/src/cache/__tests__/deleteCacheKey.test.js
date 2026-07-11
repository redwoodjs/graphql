import { describe, it, expect } from 'vitest'

import InMemoryClient from '../clients/InMemoryClient'
import { createCache } from '../index'

describe('deleteCacheKey', () => {
  it('deletes a key from the cache', async () => {
    const client = new InMemoryClient({
      test: { expires: 1977175194415, value: '{"foo":"bar"}' },
    })
    const { deleteCacheKey } = createCache(client)

    await deleteCacheKey('test')

    expect(client.storage['test']).toEqual(undefined)
  })

  it('returns true if key was deleted', async () => {
    const client = new InMemoryClient({
      test: { expires: 1977175194415, value: '{"foo":"bar"}' },
    })
    const { deleteCacheKey } = createCache(client)

    const result = await deleteCacheKey('test')

    expect(result).toEqual(true)
  })

  it('returns false if key did not exist', async () => {
    const client = new InMemoryClient({
      test: { expires: 1977175194415, value: '{"foo":"bar"}' },
    })
    const { deleteCacheKey } = createCache(client)

    const result = await deleteCacheKey('foobar')

    expect(result).toEqual(false)
  })
})
