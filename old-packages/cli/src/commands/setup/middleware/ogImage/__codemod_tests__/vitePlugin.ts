import { describe, it } from 'vitest'

describe('Vite plugin codemod', () => {
  it('Handles the default vite config case', async () => {
    await matchTransformSnapshot('codemodVitePlugin', 'defaultViteConfig')
  })
})
