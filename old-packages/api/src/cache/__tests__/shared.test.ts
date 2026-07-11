import { describe, it, expect } from 'vitest'

import { createCache, formatCacheKey, InMemoryClient } from '../index'

describe('exports', () => {
  it('exports the client that was passed in', () => {
    const client = new InMemoryClient()
    const { cacheClient } = createCache(client)

    expect(cacheClient).toEqual(client)
  })
})

describe('formatCacheKey', () => {
  it('creates a key from a string', () => {
    expect(formatCacheKey('foobar')).toEqual('foobar')
    expect(formatCacheKey('foo-bar')).toEqual('foo-bar')
  })

  it('creates a key from an array', () => {
    expect(formatCacheKey(['foo'])).toEqual('foo')
    expect(formatCacheKey(['foo', 'bar'])).toEqual('foo-bar')
  })

  it('appends a prefix', () => {
    expect(formatCacheKey('bar', 'foo')).toEqual('foo-bar')
    expect(formatCacheKey(['bar'], 'foo')).toEqual('foo-bar')
    expect(formatCacheKey(['bar', 'baz'], 'foo')).toEqual('foo-bar-baz')
  })

  it('does not append the prefix more than once', () => {
    expect(formatCacheKey('foo-bar', 'foo')).toEqual('foo-bar')
    expect(formatCacheKey(['foo', 'bar'], 'foo')).toEqual('foo-bar')
    // needs a - to match against the prefix
    expect(formatCacheKey('foobar', 'foo')).toEqual('foo-foobar')
  })
})
