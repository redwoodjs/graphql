import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'

export const command = 'coherence'

export const description = 'Setup Coherence deploy'

export function builder(yargs) {
  yargs.option('force', {
    description: 'Overwrite existing configuration',
    type: 'boolean',
    default: false,
  })
}

export async function handler(options) {
  recordTelemetryAttributes({
    command: 'setup deploy coherence',
    force: options.force,
  })
  const { handler } = await import('./coherenceHandler.js')
  return handler(options)
}
