import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'

export const command = 'tsconfig'

export const description = 'Set up tsconfig for web and api sides'

export const builder = (yargs) => {
  yargs.option('force', {
    alias: 'f',
    default: false,
    description: 'Overwrite existing tsconfig.json files',
    type: 'boolean',
  })
}

export const handler = async (options) => {
  recordTelemetryAttributes({
    command: 'setup tsconfig',
    force: options.force,
  })
  const { handler } = await import('./tsconfigHandler.js')
  return handler(options)
}
