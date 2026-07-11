import { useEngine } from '@envelop/core'
import * as GraphQLJS from 'graphql'
import { beforeEach, vi, describe, expect, it } from 'vitest'

import type * as Api from '@redwoodjs/api'

import { testSchema, testQuery } from '../__fixtures__/common'
import {
  createSpiedPlugin,
  createTestkit,
} from '../__fixtures__/envelop-testing'
import { useRedwoodAuthContext } from '../useRedwoodAuthContext'

const authDecoder = async (token: string) => ({ token })

vi.mock('@redwoodjs/api', async (importOriginal) => {
  const originalApi = await importOriginal<typeof Api>()
  return {
    ...originalApi,
    getAuthenticationContext: vi.fn().mockResolvedValue([
      { sub: '1', email: 'ba@zin.ga' },
      {
        type: 'mocked-auth-type',
        schema: 'mocked-schema-bearer',
        token: 'mocked-undecoded-token',
      },
      { event: {}, context: {} },
    ]),
  }
})

describe('useRedwoodAuthContext', () => {
  const spiedPlugin = createSpiedPlugin()

  const expectContextContains = (obj) => {
    expect(spiedPlugin.spies.beforeContextBuilding).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining(obj),
      }),
    )
  }

  beforeEach(() => {
    spiedPlugin.reset()
  })

  it('Updates context with output of current user', async () => {
    const MOCK_USER = {
      id: 'my-user-id',
      name: 'Mockity MockFace',
    }

    const mockedGetCurrentUser = vi.fn().mockResolvedValue(MOCK_USER)

    const testkit = createTestkit(
      [
        useEngine(GraphQLJS),
        useRedwoodAuthContext(mockedGetCurrentUser, authDecoder),
        spiedPlugin.plugin,
      ],
      testSchema,
    )

    await testkit.execute(testQuery, {}, { requestContext: {} })

    expectContextContains({
      currentUser: MOCK_USER,
    })

    expect(mockedGetCurrentUser).toHaveBeenCalledWith(
      { email: 'ba@zin.ga', sub: '1' },
      {
        schema: 'mocked-schema-bearer',
        token: 'mocked-undecoded-token',
        type: 'mocked-auth-type',
      },
      { context: {}, event: {} },
    )
  })

  it('Does not swallow exceptions raised in getCurrentUser', async () => {
    const mockedGetCurrentUser = vi
      .fn()
      .mockRejectedValue(new Error('Could not fetch user from db.'))

    const testkit = createTestkit(
      [
        useEngine(GraphQLJS),
        useRedwoodAuthContext(mockedGetCurrentUser, authDecoder),
      ],
      testSchema,
    )

    await expect(async () => {
      await testkit.execute(testQuery, {}, { requestContext: {} })
    }).rejects.toEqual(
      new Error('Exception in getCurrentUser: Could not fetch user from db.'),
    )
    expect(mockedGetCurrentUser).toHaveBeenCalled()
  })

  // @todo: Test exception raised when fetching auth context/parsing provider header
})
