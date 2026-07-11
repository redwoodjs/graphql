import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'

import { getEpilogue } from './util'

export const command = 'setup-inngest'

export const description =
  'Setup Inngest for background, scheduled, delayed, multi-step, and fan-out jobs'

export const EXPERIMENTAL_TOPIC_ID = 4866

export const builder = (yargs) => {
  yargs
    .option('force', {
      alias: 'f',
      default: false,
      description: 'Overwrite existing configuration',
      type: 'boolean',
    })
    .epilogue(getEpilogue(command, description, EXPERIMENTAL_TOPIC_ID, true))
}

export const handler = async (options) => {
  recordTelemetryAttributes({
    command: 'experimental setup-inngest',
    force: options.force,
  })
  const { handler } = await import('./setupInngestHandler.js')
  return handler(options)
}
