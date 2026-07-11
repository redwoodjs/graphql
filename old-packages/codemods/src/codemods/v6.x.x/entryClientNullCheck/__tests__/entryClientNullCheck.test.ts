import { describe, it } from 'vitest'

import { matchTransformSnapshot } from '../../../../testUtils/matchTransformSnapshot'

describe('entryClientNullCheck', () => {
  it('Handles the default case', async () => {
    await matchTransformSnapshot('entryClientNullCheck', 'default')
  })

  it('User has already implemented the check', async () => {
    await matchTransformSnapshot('entryClientNullCheck', 'alreadyChecking')
  })

  it('Additional code present', async () => {
    await matchTransformSnapshot('entryClientNullCheck', 'moreCode')
  })

  it('Unintelligible changes to entry file', async () => {
    await matchTransformSnapshot('entryClientNullCheck', 'unintelligible')
  })
})
