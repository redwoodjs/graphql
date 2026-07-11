export const command = 'deploy <target>'
export const description = 'Setup deployment to various targets'
import terminalLink from 'terminal-link'

export const builder = (yargs) =>
  yargs
    .commandDir('./providers', { recurse: true })
    .demandCommand()
    .option('force', {
      alias: 'f',
      default: false,
      description: 'Overwrite existing configuration',
      type: 'boolean',
    })
    .epilogue(
      `Also see the ${terminalLink(
        'Redwood CLI Reference',
        'https://redwoodjs.com/docs/cli-commands#setup-deploy-config',
      )}`,
    )
