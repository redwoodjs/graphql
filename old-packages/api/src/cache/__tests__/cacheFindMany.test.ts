import { PrismaClient } from '@prisma/client'
import { describe, afterEach, it, vi, expect } from 'vitest'

import InMemoryClient from '../clients/InMemoryClient'
import { createCache } from '../index'

const mockFindFirst = vi.fn()
const mockFindMany = vi.fn()

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    user: {
      findFirst: mockFindFirst,
      findMany: mockFindMany,
    },
  })),
  // NOTE: This is only available after `prisma generate` has been run
  PrismaClientValidationError: new Error('PrismaClientValidationError'),
}))

describe('cacheFindMany', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('adds the collection to the cache based on latest updated user', async () => {
    const now = new Date()

    const user = {
      id: 1,
      email: 'rob@redwoodjs.com',
      updatedAt: now,
    }
    mockFindFirst.mockImplementation(() => user)
    mockFindMany.mockImplementation(() => [user])

    const client = new InMemoryClient()
    const { cacheFindMany } = createCache(client)
    const spy = vi.spyOn(client, 'set')

    await cacheFindMany('test', PrismaClient().user)

    expect(spy).toHaveBeenCalled()
    expect(client.storage[`test-1-${now.getTime()}`].value).toEqual(
      JSON.stringify([user]),
    )
  })

  it('adds a new collection if a record has been updated', async () => {
    const now = new Date()
    const user = {
      id: 1,
      email: 'rob@redwoodjs.com',
      updatedAt: now,
    }
    const client = new InMemoryClient({
      [`test-1-${now.getTime()}`]: {
        expires: 1977175194415,
        value: JSON.stringify([user]),
      },
    })

    // set mock to return user that's been updated in the future, rather than
    // the timestamp that's been cached already
    const future = new Date()
    future.setSeconds(future.getSeconds() + 1000)
    user.updatedAt = future
    mockFindFirst.mockImplementation(() => user)
    mockFindMany.mockImplementation(() => [user])

    const { cacheFindMany } = createCache(client)
    const spy = vi.spyOn(client, 'set')

    await cacheFindMany('test', PrismaClient().user)

    expect(spy).toHaveBeenCalled()
    // the `now` cache still exists
    expect(
      JSON.parse(client.storage[`test-1-${now.getTime()}`].value)[0].id,
    ).toEqual(1)
    // the `future` cache should have been created
    expect(client.storage[`test-1-${future.getTime()}`].value).toEqual(
      JSON.stringify([user]),
    )
  })

  it('skips caching and just runs the findMany() if there are no records', async () => {
    const client = new InMemoryClient()
    mockFindFirst.mockImplementation(() => null)
    mockFindMany.mockImplementation(() => [])
    const { cacheFindMany } = createCache(client)
    const getSpy = vi.spyOn(client, 'get')
    const setSpy = vi.spyOn(client, 'set')

    const result = await cacheFindMany('test', PrismaClient().user)

    expect(result).toEqual([])
    expect(getSpy).not.toHaveBeenCalled()
    expect(setSpy).not.toHaveBeenCalled()
  })
})
