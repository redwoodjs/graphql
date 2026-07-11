import { describe, it } from 'vitest'

import { matchFolderTransform } from '../../../../testUtils/matchFolderTransform'
import { checkAndTransformReactRoot } from '../upgradeToReact18'

describe('upgradeToReact18', () => {
  it('Checks and transforms the react root', async () => {
    await matchFolderTransform(
      () => checkAndTransformReactRoot({ setWarning: () => {} }),
      'default',
    )
  })
})
