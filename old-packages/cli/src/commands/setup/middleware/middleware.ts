import terminalLink from 'terminal-link'
import type { Argv } from 'yargs'

import * as ogImageCommand from './ogImage/ogImage'

export const command = 'middleware <type>'
export const description = 'Set up a middleware'
export function builder(yargs: Argv) {
  return yargs
    .command(ogImageCommand)
    .epilogue(
      `Also see the ${terminalLink(
        'Redwood CLI Reference',
        'https://redwoodjs.com/docs/cli-commands',
      )}`,
    )
}
