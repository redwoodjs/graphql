import { describe, test } from 'vitest'

import { matchTransformSnapshot } from '../../../../testUtils/matchTransformSnapshot'

describe('cellQueryResult', () => {
  test('No query result properties used', async () => {
    await matchTransformSnapshot('cellQueryResult', 'default')
  })

  test('Refetch alone is used', async () => {
    await matchTransformSnapshot('cellQueryResult', 'refetch')
  })

  test('Client alone is used', async () => {
    await matchTransformSnapshot('cellQueryResult', 'client')
  })

  test('Refetch and client are used', async () => {
    await matchTransformSnapshot('cellQueryResult', 'refetchClient')
  })

  test('Refetch and client are used with client aliased', async () => {
    await matchTransformSnapshot('cellQueryResult', 'refetchClientAliased')
  })

  test('Usage in Failure and Success', async () => {
    await matchTransformSnapshot('cellQueryResult', 'failureSuccess')
  })
})
