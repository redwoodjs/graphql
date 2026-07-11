import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'

export const command = 'realtime <name>'

export const description =
  'Generate a subscription or live query used with RedwoodJS Realtime'

export function builder(yargs) {
  yargs
    .positional('name', {
      type: 'string',
      description:
        'Name of the realtime event to setup. This should be a type or model name like: Widget, Sprocket, etc.',
      demandOption: true,
    })
    .option('type', {
      alias: 't',
      type: 'string',
      choices: ['liveQuery', 'subscription'],
      description: 'Type of realtime event to setup',
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
    command: 'generate realtime',
    type: options.type,
    force: options.force,
    verbose: options.verbose,
  })
  const { handler } = await import('./realtimeHandler.js')
  return handler(options)
}
