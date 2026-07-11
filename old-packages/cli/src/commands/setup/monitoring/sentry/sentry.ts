import type { Argv } from 'yargs'

import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'

export const command = 'sentry'

export const description = 'Setup Sentry error and performance tracking'

export const builder = (yargs: Argv) => {
  return yargs.option('force', {
    alias: 'f',
    default: false,
    description: 'Overwrite existing Sentry config files',
    type: 'boolean',
  })
}

export interface Args {
  force: boolean
}

export async function handler({ force }: Args) {
  recordTelemetryAttributes({
    command: 'setup monitoring sentry',
    force,
  })

  const { handler } = await import('./sentryHandler.js')
  return handler({ force })
}
