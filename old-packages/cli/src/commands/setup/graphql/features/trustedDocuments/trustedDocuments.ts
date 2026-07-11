import type { Argv } from 'yargs'

import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'

export const command = 'trusted-documents'
export const description = 'Set up Trusted Documents for GraphQL'

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
    command: 'setup graphql trusted-documents',
    force,
  })

  const { handler } = await import('./trustedDocumentsHandler.js')
  return handler({ force })
}
