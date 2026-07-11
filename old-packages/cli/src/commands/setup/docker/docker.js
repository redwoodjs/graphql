import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'

export const command = 'docker'

export const description = 'Setup the default Redwood Dockerfile'

export function builder(yargs) {
  yargs.option('force', {
    alias: 'f',
    default: false,
    description: 'Overwrite existing configuration',
    type: 'boolean',
  })
}

export async function handler(options) {
  recordTelemetryAttributes({
    command: 'setup docker',
    force: options.force,
    verbose: options.verbose,
  })

  const { handler } = await import('./dockerHandler.js')
  return handler(options)
}
