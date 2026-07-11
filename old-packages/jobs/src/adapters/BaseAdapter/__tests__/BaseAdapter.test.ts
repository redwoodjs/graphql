import { describe, expect, it } from 'vitest'

import { mockLogger } from '../../../core/__tests__/mocks.js'
import { BaseAdapter } from '../BaseAdapter.js'
import type { BaseAdapterOptions } from '../BaseAdapter.js'

interface TestAdapterOptions extends BaseAdapterOptions {
  foo: string
}

class TestAdapter extends BaseAdapter<TestAdapterOptions> {
  schedule() {}
  find() {
    return undefined
  }
  success() {}
  error() {}
  failure() {}
  clear() {}
}

describe('constructor', () => {
  it('saves options', () => {
    const adapter = new TestAdapter({ foo: 'bar' })

    expect(adapter.options.foo).toEqual('bar')
  })

  it('creates a separate instance var for any logger', () => {
    const adapter = new TestAdapter({ foo: 'bar', logger: mockLogger })

    expect(adapter.logger).toEqual(mockLogger)
  })
})
