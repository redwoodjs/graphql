import { describe, it } from 'vitest'

import { matchFolderTransform } from '../../../../testUtils/matchFolderTransform'
import { updateGraphqlConfig } from '../updateGraphqlConfig'

describe('updateGraphQLConfig', () => {
  it('Replaces graphql.config.js with a new version downloaded from GH', async () => {
    await matchFolderTransform(updateGraphqlConfig)
  })
})
