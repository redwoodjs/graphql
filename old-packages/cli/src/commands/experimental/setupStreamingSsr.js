import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'

import { getEpilogue } from './util'

export const command = 'setup-streaming-ssr'

export const description =
  'Enable React Streaming and Server Side Rendering (SSR)'

export const EXPERIMENTAL_TOPIC_ID = 5052

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
    command: ['experimental', command].join(' '),
    force: options.force,
  })
  const { handler } = await import('./setupStreamingSsrHandler.js')
  return handler(options)
}
