import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'

export const command = 'vite'

export const description = 'Configure the web side to use Vite'

export const builder = (yargs) => {
  yargs.option('force', {
    alias: 'f',
    default: false,
    description: 'Overwrite existing configuration',
    type: 'boolean',
  })
  yargs.option('verbose', {
    alias: 'v',
    default: false,
    description: 'Print more logs',
    type: 'boolean',
  })
  yargs.option('add-package', {
    default: true,
    description:
      'Allows you to skip adding the @redwoodjs/vite package. Useful for testing',
    type: 'boolean',
  })
}

export const handler = async (options) => {
  recordTelemetryAttributes({
    command: 'setup vite',
    force: options.force,
    verbose: options.verbose,
    addPackage: options.addPackage,
  })
  const { handler } = await import('./viteHandler.js')
  return handler(options)
}
