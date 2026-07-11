import terminalLink from 'terminal-link'
import type { Argv } from 'yargs'

import * as fragmentsCommand from './features/fragments/fragments'
import * as trustedDocumentsCommand from './features/trustedDocuments/trustedDocuments'

export const command = 'graphql <feature>'
export const description = 'Set up GraphQL feature support'
export function builder(yargs: Argv) {
  return yargs
    .command(fragmentsCommand)
    .command(trustedDocumentsCommand)
    .epilogue(
      `Also see the ${terminalLink(
        'Redwood CLI Reference',
        'https://redwoodjs.com/docs/cli-commands#setup-graphql',
      )}`,
    )
}
