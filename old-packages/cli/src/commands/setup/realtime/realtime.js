import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'

export const command = 'realtime'

export const description = 'Setup RedwoodJS Realtime'

export function builder(yargs) {
  yargs
    .option('includeExamples', {
      alias: ['e', 'examples'],
      default: true,
      description:
        'Include examples of how to implement liveQueries and subscriptions',
      type: 'boolean',
    })
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
}

export async function handler(options) {
  recordTelemetryAttributes({
    command: 'setup realtime',
    includeExamples: options.includeExamples,
    force: options.force,
    verbose: options.verbose,
  })
  const { handler } = await import('./realtimeHandler.js')
  return handler(options)
}
