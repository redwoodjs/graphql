import { describe, it } from 'vitest'

import { matchTransformSnapshot } from '../../../../testUtils/matchTransformSnapshot'

describe('clerk', () => {
  it('updates the getCurrentUser function', async () => {
    await matchTransformSnapshot('updateClerkGetCurrentUser', 'default')
  })
})
