import { describe, it } from 'vitest'

import { matchFolderTransform } from '../../../../testUtils/matchFolderTransform'

describe('convertJsToJsx', () => {
  it('Converts an example project correctly', async () => {
    await matchFolderTransform('convertJsToJsx', 'example', {
      useJsCodeshift: true,
      targetPathsGlob: 'web/src/**/*.js',
    })
  })

  it('Converts a js file containing jsx', async () => {
    await matchFolderTransform('convertJsToJsx', 'withJSX', {
      useJsCodeshift: true,
    })
  })

  it('Ignores a js file not containing jsx', async () => {
    await matchFolderTransform('convertJsToJsx', 'withoutJSX', {
      useJsCodeshift: true,
    })
  })
})
