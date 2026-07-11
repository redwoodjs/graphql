import type { Argv } from 'yargs'

import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'

export const command = 'og-image'
export const aliases = ['ogImage', 'ogimage']
export const description = 'Set up OG Image generation middleware'

export function builder(yargs: Argv) {
  return yargs.option('force', {
    alias: 'f',
    default: false,
    description: 'Overwrite existing configuration',
    type: 'boolean',
  })
}

export async function handler({ force }: { force: boolean }) {
  recordTelemetryAttributes({
    command: 'setup middleware og-image',
    force,
  })

  const { handler } = await import('./ogImageHandler.js')
  return handler({ force })
}
