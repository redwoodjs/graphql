import { describe, it } from 'vitest'

import { matchFolderTransform } from '../../../../testUtils/matchFolderTransform'
import addApiAliasToTsConfig from '../tsconfigForRouteHooks'

describe('tsconfigForRouteHooks', () => {
  it('Adds $api to web/tsconfig.json', async () => {
    await matchFolderTransform(addApiAliasToTsConfig, 'default')
  })
})
