import terminalLink from 'terminal-link'

import c from '../lib/colors'
import { exitWithError } from '../lib/exit'
import { sides } from '../lib/project'
import { checkNodeVersion } from '../middleware/checkNodeVersion'

export const command = 'build [side..]'
export const description = 'Build for production'

export const builder = (yargs) => {
  const choices = sides()

  yargs
    .positional('side', {
      choices,
      default: choices,
      description: 'Which side(s) to build',
      type: 'array',
    })
    .option('verbose', {
      alias: 'v',
      default: false,
      description: 'Print more',
      type: 'boolean',
    })
    .option('prerender', {
      default: true,
      description: 'Prerender after building web',
      type: 'boolean',
    })
    .option('prisma', {
      type: 'boolean',
      alias: 'db',
      default: true,
      description: 'Generate the Prisma client',
    })
    .middleware(() => {
      const check = checkNodeVersion()

      if (check.ok) {
        return
      }

      exitWithError(undefined, {
        message: `${c.error('Error')}: ${check.message}`,
        includeEpilogue: false,
      })
    })
    .epilogue(
      `Also see the ${terminalLink(
        'Redwood CLI Reference',
        'https://redwoodjs.com/docs/cli-commands#build',
      )}`,
    )
}

export const handler = async (options) => {
  const { handler } = await import('./buildHandler.js')
  return handler(options)
}
