import { useEngine } from '@envelop/core'
import * as GraphQLJS from 'graphql'
import { beforeEach, vi, describe, expect, it } from 'vitest'

import { testSchema, testQuery } from '../__fixtures__/common'
import {
  createSpiedPlugin,
  createTestkit,
} from '../__fixtures__/envelop-testing'
import { useRedwoodPopulateContext } from '../useRedwoodPopulateContext'

describe('Populates context', () => {
  const spiedPlugin = createSpiedPlugin()

  const expectContextContains = (obj: Record<string, string | boolean>) => {
    expect(spiedPlugin.spies.beforeContextBuilding).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining(obj),
      }),
    )
  }

  beforeEach(() => {
    spiedPlugin.reset()
  })

  it('Should extend context based on output of function', async () => {
    const populateContextSpy = vi.fn(() => {
      return {
        bazinga: true,
      }
    })

    const testkit = createTestkit(
      [
        useEngine(GraphQLJS),
        useRedwoodPopulateContext(populateContextSpy),
        // @NOTE add spy here to check if context has been changed
        spiedPlugin.plugin,
      ],
      testSchema,
    )

    await testkit.execute(testQuery, {}, {})

    expect(populateContextSpy).toHaveBeenCalled()
    expectContextContains({ bazinga: true })
  })

  it('Should extend context with an object, if one is provided', async () => {
    const populateContextSpy = vi.fn(() => {
      return {
        bazinga: true,
      }
    })

    const testkit = createTestkit(
      [
        useEngine(GraphQLJS),
        useRedwoodPopulateContext({
          dtWasHere: 'hello!',
        }),
        // @NOTE add spy here to check if context has been changed
        spiedPlugin.plugin,
      ],
      testSchema,
    )

    await testkit.execute(testQuery, {}, {})

    expect(populateContextSpy).not.toHaveBeenCalled()
    expectContextContains({ dtWasHere: 'hello!' })
  })
})
