import path from 'path'

import fs from 'fs-extra'
import terminalLink from 'terminal-link'

import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'

export const command = 'generator <name>'
export const description =
  'Copies generator templates locally for customization'

const EXCLUDE_GENERATORS = [
  'dataMigration',
  'dbAuth',
  'generator',
  'script',
  'secret',
]

// This could be built using createYargsForComponentGeneration;
// however, functions wouldn't have a `stories` option. createYargs...
// should be reversed to provide `yargsDefaults` as the default configuration
// and accept a configuration such as its CURRENT default to append onto a command.
export const builder = (yargs) => {
  const availableGenerators = fs
    .readdirSync(path.join(__dirname, '../../generate'), {
      withFileTypes: true,
    })
    .filter((dir) => dir.isDirectory() && !dir.name.match(/__/))
    .map((dir) => dir.name)

  yargs
    .positional('name', {
      description: 'Name of the generator to copy templates from',
      choices: availableGenerators.filter(
        (dir) => !EXCLUDE_GENERATORS.includes(dir),
      ),
    })
    .option('force', {
      alias: 'f',
      default: false,
      description: 'Overwrite existing files',
      type: 'boolean',
    })
    .epilogue(
      `Also see the ${terminalLink(
        'Redwood CLI Reference',
        'https://redwoodjs.com/docs/cli-commands#setup-generator',
      )}`,
    )
}

export const handler = async (options) => {
  recordTelemetryAttributes({
    command: 'setup generator',
    name: options.name,
    force: options.force,
  })
  const { handler } = await import('./generatorHandler.js')
  return handler(options)
}
