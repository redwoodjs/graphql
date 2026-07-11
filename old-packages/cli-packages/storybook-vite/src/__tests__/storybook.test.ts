import terminalLink from 'terminal-link'
import { vi, describe, it, expect } from 'vitest'
import type { Argv } from 'yargs'

import * as storybookCommand from '../commands/storybook'
import { handler as storybookViteHandler } from '../commands/storybookHandler.js'
import type { StorybookYargsOptions } from '../types.js'

vi.mock('../commands/storybookHandler.js', () => ({
  handler: vi.fn(),
}))

describe('storybook', () => {
  it('exports command, aliases, description, defaultOptions, builder, and handler', () => {
    for (const property of [
      'command',
      'aliases',
      'description',
      'defaultOptions',
      'builder',
      'handler',
    ]) {
      expect(storybookCommand).toHaveProperty(property)
    }
  })

  it("`command`, `aliases`, and `description` haven't unintentionally changed", () => {
    expect(storybookCommand.command).toEqual('storybook')
    expect(storybookCommand.aliases).toEqual(['sb'])
    expect(storybookCommand.description).toEqual(
      'Launch Storybook: a tool for building UI components and pages in isolation',
    )
  })

  it("`defaultOptions` haven't unintentionally changed", () => {
    expect(storybookCommand.defaultOptions).toEqual({
      open: true,
      build: false,
      ci: false,
      port: 7910,
      buildDirectory: 'public/storybook',
      smokeTest: false,
    })
  })

  it('`builder` has an epilogue', () => {
    // The typecasting here is to make TS happy when calling `builder(yargs)`
    // further down. We know that only `epilogue` will be called.
    const yargs = {
      option: vi.fn().mockReturnThis(),
      epilogue: vi.fn().mockReturnThis(),
    } as unknown as Argv<StorybookYargsOptions>
    storybookCommand.builder(yargs)
    // The epilogue is a string that contains a link to the docs. The string
    // contains special control characters when rendered in a terminal that
    // supports clickable links. We use regular expressions and wildcards here
    // to avoid having to match control characters that might not even always
    // be there
    expect(yargs.epilogue).toHaveBeenCalledWith(
      `Also see the ${terminalLink(
        'Redwood CLI Reference',
        'https://redwoodjs.com/docs/cli-commands#storybook',
      )}`,
    )
  })

  it('`handler` proxies to `./storybookHandler.js`', async () => {
    const options = {
      open: true,
      build: false,
      ci: false,
      port: 7910,
      buildDirectory: 'public/storybook',
      smokeTest: false,
    }
    await storybookCommand.handler(options)
    expect(storybookViteHandler).toHaveBeenCalledWith(options)
  })
})
