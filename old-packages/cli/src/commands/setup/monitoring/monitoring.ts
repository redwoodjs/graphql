import terminalLink from 'terminal-link'
import type { Argv } from 'yargs'

import * as sentryCommand from './sentry/sentry.js'

export const command = 'monitoring <provider>'
export const description = 'Set up monitoring in your Redwood app'
export function builder(yargs: Argv) {
  return yargs
    .command(sentryCommand)
    .epilogue(
      `Also see the ${terminalLink(
        'Redwood CLI Reference',
        'https://redwoodjs.com/docs/cli-commands#setup-graphql',
      )}`,
    )
}
