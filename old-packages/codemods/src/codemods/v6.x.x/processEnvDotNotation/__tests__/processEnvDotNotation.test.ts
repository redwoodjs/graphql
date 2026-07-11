import { describe, it } from 'vitest'

import { matchTransformSnapshot } from '../../../../testUtils/matchTransformSnapshot'

describe('processEnvDotNotation', () => {
  it('Replaces array access syntax with dot notation', async () => {
    await matchTransformSnapshot('processEnvDotNotation', 'default')
  })
})
