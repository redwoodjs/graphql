import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import { getDevNodeOptions } from '../../commands/devHandler'

describe('getNodeOptions', () => {
  const enableSourceMapsOption = '--enable-source-maps'
  let oldNodeOptions = ''

  beforeEach(() => {
    oldNodeOptions = process.env.NODE_OPTIONS
    process.env.NODE_OPTIONS = ''
  })

  afterEach(() => {
    process.env.NODE_OPTIONS = oldNodeOptions
  })

  it('defaults to enable-source-maps', () => {
    const nodeOptions = getDevNodeOptions()
    expect(nodeOptions).toEqual(enableSourceMapsOption)
  })

  it("doesn't specify `--enable-source-maps` twice", () => {
    process.env.NODE_OPTIONS = enableSourceMapsOption

    const nodeOptions = getDevNodeOptions()
    expect(nodeOptions).toEqual(enableSourceMapsOption)
  })

  it('merges existing options with `--enable-source-maps`', () => {
    const existingOptions = '--inspect --no-experimental-fetch'
    process.env.NODE_OPTIONS = existingOptions

    const nodeOptions = getDevNodeOptions()

    expect(nodeOptions).toEqual(`${existingOptions} ${enableSourceMapsOption}`)
  })
})
