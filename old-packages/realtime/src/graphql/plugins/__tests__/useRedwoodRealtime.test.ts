import {
  createTestkit,
  createSpiedPlugin,
  assertStreamExecutionValue,
} from '@envelop/testing'
import { describe, it, expect } from 'vitest'

import { testQuery, testLiveQuery, testSchema } from '../__fixtures__/common'
import {
  useRedwoodRealtime,
  InMemoryLiveQueryStore,
} from '../useRedwoodRealtime'

describe('useRedwoodRealtime', () => {
  it('should support a @live query directive', async () => {
    const testkit = createTestkit(
      [useRedwoodRealtime({ liveQueries: { store: 'in-memory' } })],
      testSchema,
    )

    const result = await testkit.execute(testLiveQuery, {}, {})

    assertStreamExecutionValue(result)
    const current = await result.next()
    expect(current.value).toMatchInlineSnapshot(`
      {
        "data": {
          "me": {
            "id": "1",
            "name": "Ba Zinga",
          },
        },
        "isLive": true,
      }
    `)
  })

  it('should update schema with live directive', () => {
    const spiedPlugin = createSpiedPlugin()

    // the original schema should not have the live directive before the useRedwoodRealtime plugin is applied
    expect(testSchema.getDirective('live')).toBeUndefined()

    createTestkit(
      [
        useRedwoodRealtime({ liveQueries: { store: 'in-memory' } }),
        spiedPlugin.plugin,
      ],
      testSchema,
    )

    // the replaced schema should have the live directive afterwards
    const replacedSchema =
      spiedPlugin.spies.onSchemaChange.mock.calls[0][0].schema

    const liveDirectiveOnSchema = replacedSchema.getDirective('live')

    expect(liveDirectiveOnSchema.name).toEqual('live')
    expect(replacedSchema.getDirective('live')).toMatchSnapshot()
  })

  it('with live directives, it should extend the graphQL context with a store', async () => {
    const spiedPlugin = createSpiedPlugin()

    const testkit = createTestkit(
      [
        useRedwoodRealtime({ liveQueries: { store: 'in-memory' } }),
        spiedPlugin.plugin,
      ],
      testSchema,
    )

    await testkit.execute(testQuery)

    expect(spiedPlugin.spies.beforeContextBuilding).toHaveBeenCalledTimes(1)
    expect(spiedPlugin.spies.beforeContextBuilding).toHaveBeenCalledWith({
      context: expect.any(Object),
      extendContext: expect.any(Function),
      breakContextBuilding: expect.any(Function),
    })

    expect(spiedPlugin.spies.afterContextBuilding).toHaveBeenCalledTimes(1)
    expect(spiedPlugin.spies.afterContextBuilding).toHaveBeenCalledWith({
      context: expect.objectContaining({
        liveQueryStore: expect.any(InMemoryLiveQueryStore),
      }),
      extendContext: expect.any(Function),
    })
  })

  it('with subscriptions, it should extend the GraphQL context with pubSub transport', async () => {
    const spiedPlugin = createSpiedPlugin()

    const testkit = createTestkit(
      [
        useRedwoodRealtime({
          subscriptions: { store: 'in-memory', subscriptions: [] },
        }),
        spiedPlugin.plugin,
      ],
      testSchema,
    )

    await testkit.execute(testQuery)

    expect(spiedPlugin.spies.beforeContextBuilding).toHaveBeenCalledTimes(1)
    expect(spiedPlugin.spies.beforeContextBuilding).toHaveBeenCalledWith({
      context: expect.any(Object),
      extendContext: expect.any(Function),
      breakContextBuilding: expect.any(Function),
    })

    expect(spiedPlugin.spies.afterContextBuilding).toHaveBeenCalledTimes(1)
    expect(spiedPlugin.spies.afterContextBuilding).toHaveBeenCalledWith({
      context: expect.objectContaining({
        pubSub: expect.objectContaining({
          publish: expect.any(Function),
          subscribe: expect.any(Function),
        }),
      }),
      extendContext: expect.any(Function),
    })
  })
})
