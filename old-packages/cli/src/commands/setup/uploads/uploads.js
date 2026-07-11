import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'

export const command = 'uploads'

export const description =
  'Setup uploads and storage. This will install the required packages and add the required initial configuration to your redwood app.'

export const builder = (yargs) => {
  yargs.option('force', {
    alias: 'f',
    default: false,
    description: 'Overwrite existing configuration',
    type: 'boolean',
  })
}

export const handler = async (options) => {
  recordTelemetryAttributes({
    command: 'setup uploads',
    force: options.force,
    skipExamples: options.skipExamples,
  })
  const { handler } = await import('./uploadsHandler.js')
  return handler(options)
}
