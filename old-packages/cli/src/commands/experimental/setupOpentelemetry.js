import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'

import { getEpilogue } from './util'

export const command = 'setup-opentelemetry'

export const description = 'Setup OpenTelemetry within the API side'

export const EXPERIMENTAL_TOPIC_ID = 4772

export const builder = (yargs) => {
  yargs
    .option('force', {
      alias: 'f',
      default: false,
      description: 'Overwrite existing configuration',
      type: 'boolean',
    })
    .option('verbose', {
      alias: 'v',
      default: false,
      description: 'Print more logs',
      type: 'boolean',
    })
    .epilogue(getEpilogue(command, description, EXPERIMENTAL_TOPIC_ID, true))
}

export const handler = async (options) => {
  recordTelemetryAttributes({
    command: 'experimental setup-opentelemetry',
    force: options.force,
    verbose: options.verbose,
  })
  const { handler } = await import('./setupOpentelemetryHandler.js')
  return handler(options)
}
