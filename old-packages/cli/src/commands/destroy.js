export const command = 'destroy <type>'
export const aliases = ['d']
export const description = 'Rollback changes made by the generate command'
import terminalLink from 'terminal-link'

export const builder = (yargs) =>
  yargs
    .commandDir('./destroy', { recurse: true })
    .demandCommand()
    .epilogue(
      `Also see the ${terminalLink(
        'Redwood CLI Reference',
        'https://redwoodjs.com/docs/cli-commands#destroy-alias-d',
      )}`,
    )
