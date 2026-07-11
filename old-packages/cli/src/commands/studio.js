import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'

export const command = 'studio'
export const description = 'Run the Redwood development studio'

export function builder(yargs) {
  yargs.option('open', {
    default: true,
    description: 'Open the studio in your browser',
  })
}

export async function handler(options) {
  recordTelemetryAttributes({
    command: 'studio',
    open: options.open,
  })
  const { handler } = await import('./studioHandler.js')
  return handler(options)
}
