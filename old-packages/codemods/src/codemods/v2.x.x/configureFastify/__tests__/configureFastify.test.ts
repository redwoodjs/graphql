import { describe, it } from 'vitest'

import { matchTransformSnapshot } from '../../../../testUtils/matchTransformSnapshot'

describe('configureFastify', () => {
  it('Converts module.exports to { config }', async () => {
    await matchTransformSnapshot('configureFastify', 'default')
  })
})
