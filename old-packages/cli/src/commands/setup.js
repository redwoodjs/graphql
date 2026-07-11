import terminalLink from 'terminal-link'

import detectRwVersion from '../middleware/detectProjectRwVersion'

export const command = 'setup <command>'
export const description = 'Initialize project config and install packages'

export const builder = (yargs) =>
  yargs
    .commandDir('./setup', {
      recurse: true,
      // @NOTE This regex will ignore all commands nested more than two
      // levels deep.
      // e.g. /setup/hi.js & setup/hi/hi.js are picked up, but
      // setup/hi/hello/bazinga.js will be ignored
      // The [/\\] bit is for supporting both windows and unix style paths
      // Also take care to not trip up on paths that have "setup" earlier
      // in the path by eagerly matching in the start of the regexp
      exclude: /.*[/\\]setup[/\\].*[/\\].*[/\\]/,
    })
    .demandCommand()
    .middleware(detectRwVersion)
    .epilogue(
      `Also see the ${terminalLink(
        'Redwood CLI Reference',
        'https://redwoodjs.com/docs/cli-commands#setup',
      )}`,
    )
