import { describe, it } from 'vitest'

import { matchTransformSnapshot } from '../../../../testUtils/matchTransformSnapshot'

describe('changeGlobalToGlobalThis', () => {
  it('Converts global to globalThis', async () => {
    await matchTransformSnapshot('changeGlobalToGlobalThis', 'default')
  })
})
