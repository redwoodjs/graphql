import terminalLink from 'terminal-link'

import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'

export const command = 'jobs'
export const description =
  'Sets up the config file and parent directory for background jobs'

export const builder = (yargs) => {
  yargs
    .option('force', {
      alias: 'f',
      default: false,
      description: 'Overwrite existing files',
      type: 'boolean',
    })
    .epilogue(
      `Also see the ${terminalLink(
        'Redwood CLI Reference',
        'https://redwoodjs.com/docs/cli-commands#setup-jobs',
      )}`,
    )
}

export const handler = async (options) => {
  recordTelemetryAttributes({
    command: 'setup jobs',
    force: options.force,
  })
  const { handler } = await import('./jobsHandler.js')
  return handler(options)
}
