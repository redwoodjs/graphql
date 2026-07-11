export const command = 'deploy <target>'
export const description = 'Deploy your Redwood project'
import terminalLink from 'terminal-link'

export const builder = (yargs) =>
  yargs
    .commandDir('./deploy', { recurse: false })
    .demandCommand()
    .epilogue(
      `Also see the ${terminalLink(
        'Redwood CLI Reference',
        'https://redwoodjs.com/docs/cli-commands#deploy',
      )}\n`,
    )
