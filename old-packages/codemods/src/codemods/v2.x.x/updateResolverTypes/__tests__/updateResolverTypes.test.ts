import { describe, it } from 'vitest'

import { matchTransformSnapshot } from '../../../../testUtils/matchTransformSnapshot'

describe('updateResolverTypes', () => {
  it('Converts PostResolvers to PostRelationResolvers>', async () => {
    await matchTransformSnapshot('updateResolverTypes', 'default')
  })
})
