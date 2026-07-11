import { describe, it } from 'vitest'

describe('Middleware codemod', () => {
  it('Handles the default TSX case', async () => {
    await matchTransformSnapshot('codemodMiddleware', 'defaultTsx')
  })

  it('Handles when OgImageMiddleware is already imported', async () => {
    await matchTransformSnapshot('codemodMiddleware', 'alreadyContainsImport')
  })

  it('Handles when registerMiddleware function is already defined', async () => {
    await matchTransformSnapshot(
      'codemodMiddleware',
      'registerFunctionAlreadyDefined',
    )
  })
})
