import terminalLink from 'terminal-link'

import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'

export const command = 'package <npm-package>'
export const description = 'Execute functionality from an NPM package'

export const builder = (yargs) => {
  yargs
    .positional('npm-package', {
      description:
        'The NPM package to install and run. This can be a package name or a package name with a version or tag.',
      type: 'string',
      alias: 'npmPackage',
    })
    .option('force', {
      default: false,
      description:
        'Force the use of a potentially incompatible version of the package',
      type: 'boolean',
      alias: 'f',
    })
    .option('options', {
      default: [],
      description: 'Options to forward on when running the package.',
      type: 'array',
    })
    .epilogue(
      `Also see the ${terminalLink(
        'Redwood CLI Reference',
        'https://redwoodjs.com/docs/cli-commands#lint'
      )}`
    )
}

export const handler = async (options) => {
  recordTelemetryAttributes({
    command: 'setup package',
  })

  const { handler } = await import('./packageHandler.js')
  return handler(options)
}
