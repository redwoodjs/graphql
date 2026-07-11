import { describe, expect, it } from 'vitest'

import { context as globalContext, setContext } from '@redwoodjs/context'
import { getAsyncStoreInstance } from '@redwoodjs/context/dist/store'

describe('Global context with context isolation', () => {
  it('Should work when assigning directly into context', async () => {
    const asyncStore = getAsyncStoreInstance()

    asyncStore.run(new Map(), () => {
      // This is the actual test
      globalContext.myNewValue = 'bazinga'

      expect(globalContext.myNewValue).toBe('bazinga')
    })

    // Check that context was isolated
    expect(globalContext.myNewValue).not.toBe('bazinga')
  })

  it('Should work when using setContext', async () => {
    const asyncStore = getAsyncStoreInstance()

    asyncStore.run(new Map(), () => {
      // This is the actual test
      setContext({ anotherValue: 'kittens' })

      expect(globalContext.anotherValue).toBe('kittens')
    })

    // Check that context was isolated
    expect(globalContext.anotherValue).not.toBe('kittens')
  })

  it('setContext replaces global context', async () => {
    const asyncStore = getAsyncStoreInstance()

    asyncStore.run(new Map(), () => {
      // This is the actual test
      globalContext.myNewValue = 'bazinga'
      setContext({ anotherValue: 'kittens' })

      expect(globalContext.myNewValue).toBeUndefined()
      expect(globalContext.anotherValue).toBe('kittens')
    })

    // Check that context was isolated
    expect(globalContext.myNewValue).toBeUndefined()
    expect(globalContext.anotherValue).toBeUndefined()
  })
})
