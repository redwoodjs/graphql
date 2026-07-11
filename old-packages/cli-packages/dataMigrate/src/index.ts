import terminalLink from 'terminal-link'
import type { Argv } from 'yargs'

import {
  command as installCommand,
  description as installDescription,
  builder as installBuilder,
  handler as installHandler,
} from './commands/install'
import {
  command as upCommand,
  description as upDescription,
  builder as upBuilder,
  handler as upHandler,
} from './commands/up'

const command = 'data-migrate <command>'
const aliases = ['dataMigrate', 'dm']
const description = 'Migrate the data in your database'

function builder(yargs: Argv) {
  yargs
    .command(installCommand, installDescription, installBuilder, installHandler)
    // @ts-expect-error not sure; this is a valid signature
    .command(upCommand, upDescription, upBuilder, upHandler)
    .epilogue(
      `Also see the ${terminalLink(
        'Redwood CLI Reference',
        'https://redwoodjs.com/docs/cli-commands#datamigrate',
      )}`,
    )
}

export const commands = [
  {
    command,
    aliases,
    description,
    builder,
  },
]
