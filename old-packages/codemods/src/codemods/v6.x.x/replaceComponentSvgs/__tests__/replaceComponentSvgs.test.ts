import { describe, it } from 'vitest'

import { matchFolderTransform } from '../../../../testUtils/matchFolderTransform'

describe('replaceComponentSvgs', () => {
  it('Handles simple Svgs as components', async () => {
    await matchFolderTransform('replaceComponentSvgs', 'simple', {
      useJsCodeshift: true,
      targetPathsGlob: '**/*.{js,jsx,tsx}',
      removeWhitespace: true, // needed for matching
    })
  })

  it('Preserves attrs & deals with nesting', async () => {
    await matchFolderTransform('replaceComponentSvgs', 'complex', {
      useJsCodeshift: true,
      targetPathsGlob: '**/*.{js,jsx,tsx}',
      removeWhitespace: true, // needed for matching
    })
  })

  it('Deals with src alias & casing in filenames', async () => {
    await matchFolderTransform('replaceComponentSvgs', 'srcAlias', {
      useJsCodeshift: true,
      targetPathsGlob: '**/*.{js,jsx,tsx}',
      removeWhitespace: true, // needed for matching
    })
  })

  it('Deals with when SVGs are rexported', async () => {
    await matchFolderTransform('replaceComponentSvgs', 'reExported', {
      useJsCodeshift: true,
      targetPathsGlob: '**/*.{js,jsx,tsx}',
      removeWhitespace: true, // needed for matching
    })
  })
})
