import { useEngine } from '@envelop/core'
import * as GraphQLJS from 'graphql'
import { expect, test } from 'vitest'

import type { GlobalContext } from '@redwoodjs/context'
import { context, setContext } from '@redwoodjs/context'
import { getAsyncStoreInstance } from '@redwoodjs/context/dist/store'

import { testSchema, testQuery } from '../__fixtures__/common'
import { createTestkit } from '../__fixtures__/envelop-testing'
import { useRedwoodGlobalContextSetter } from '../useRedwoodGlobalContextSetter'
import { useRedwoodPopulateContext } from '../useRedwoodPopulateContext'

test('Context is correctly populated', async () => {
  const testkit = createTestkit(
    [
      useEngine(GraphQLJS),
      useRedwoodPopulateContext(() => ({ hello: 'world' })),
      useRedwoodPopulateContext({ foo: 'bar' }),
      useRedwoodGlobalContextSetter(),
    ],
    testSchema,
  )

  await getAsyncStoreInstance().run(
    new Map<string, GlobalContext>(),
    async () => {
      await testkit.execute(testQuery, {}, {})

      expect(context.hello).toBe('world')
      expect(context.foo).toBe('bar')
      expect(context.bazinga).toBeUndefined()
    },
  )
})

test('Plugin lets you populate context at any point in the lifecycle', async () => {
  const testkit = createTestkit(
    [
      useEngine(GraphQLJS),
      useRedwoodGlobalContextSetter(),
      useRedwoodPopulateContext(() => ({ hello: 'world' })),
      useRedwoodPopulateContext({ foo: 'bar' }),
      useRedwoodPopulateContext({ bazinga: 'new value!' }),
    ],
    testSchema,
  )

  await getAsyncStoreInstance().run(
    new Map<string, GlobalContext>(),
    async () => {
      await testkit.execute(testQuery, {}, {})

      expect(context.hello).toBe('world')
      expect(context.foo).toBe('bar')
      expect(context.bazinga).toBe('new value!')
    },
  )
})

test('setContext erases the existing context', async () => {
  const testkit = createTestkit(
    [
      useEngine(GraphQLJS),
      useRedwoodPopulateContext(() => ({ hello: 'world' })),
      useRedwoodPopulateContext({ foo: 'bar' }),
      useRedwoodGlobalContextSetter(),
    ],
    testSchema,
  )

  await getAsyncStoreInstance().run(
    new Map<string, GlobalContext>(),
    async () => {
      await testkit.execute(testQuery, {}, {})
      setContext({ bazinga: 'new value!' })

      expect(context.hello).toBeUndefined()
      expect(context.foo).toBeUndefined()
      expect(context.bazinga).toBe('new value!')
    },
  )
})
