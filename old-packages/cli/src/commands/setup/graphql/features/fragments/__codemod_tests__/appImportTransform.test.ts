import { describe, test } from 'vitest'

describe('fragments possibleTypes import', () => {
  test('Default App.tsx', async () => {
    await matchFolderTransform('appImportTransform', 'import-simple', {
      useJsCodeshift: true,
    })
  })

  test('App.tsx with existing import', async () => {
    await matchFolderTransform('appImportTransform', 'existingImport', {
      useJsCodeshift: true,
    })
  })
})
