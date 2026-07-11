import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'

export const command = 'mailer'

export const description =
  'Setup the redwood mailer. This will install the required packages and add the required initial configuration to your redwood app.'

export const builder = (yargs) => {
  yargs
    .option('force', {
      alias: 'f',
      default: false,
      description: 'Overwrite existing configuration',
      type: 'boolean',
    })
    .option('skip-examples', {
      default: false,
      description: 'Only include required files and exclude any examples',
      type: 'boolean',
    })
}

export const handler = async (options) => {
  recordTelemetryAttributes({
    command: 'setup mailer',
    force: options.force,
    skipExamples: options.skipExamples,
  })
  const { handler } = await import('./mailerHandler.js')
  return handler(options)
}
