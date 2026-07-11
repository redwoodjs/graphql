import { describe, it, expect } from 'vitest'

import { excludeOnMatch } from '../vite-plugin-remove-from-bundle.js'

describe('excludeModule', () => {
  it('should return true if idToExclude matches id', () => {
    const loadOutput = excludeOnMatch(
      [{ id: /router\/dist\/splash-page/ }],
      '/Users/dac09/Experiments/splash-page-null-loader/node_modules/@redwoodjs/router/dist/splash-page.js?commonjs-exports',
    )

    expect(loadOutput).not.toEqual({
      code: 'module.exports = null',
    })
  })

  it("should return false if idToExclude doesn't match id", () => {
    const loadOutput = excludeOnMatch(
      [{ id: /bazinga-page/ }],
      '/Users/dac09/Experiments/splash-page-null-loader/node_modules/@redwoodjs/router/dist/params.js',
    )

    expect(loadOutput).toEqual(null)
  })
})
