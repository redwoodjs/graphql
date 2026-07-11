import terminalLink from 'terminal-link'

import { sides } from '../lib/project'

export const command = 'type-check [sides..]'
export const aliases = ['tsc', 'tc']
export const description = 'Run a TypeScript compiler check on your project'
export const builder = (yargs) => {
  yargs
    .strict(false) // so that we can forward arguments to tsc
    .positional('sides', {
      default: sides(),
      description: 'Which side(s) to run a typecheck on',
      type: 'array',
    })
    .option('prisma', {
      type: 'boolean',
      default: true,
      description: 'Generate the Prisma client',
    })
    .option('generate', {
      type: 'boolean',
      default: true,
      description: 'Regenerate types within the project',
    })
    .option('verbose', {
      alias: 'v',
      default: false,
      description: 'Print more',
      type: 'boolean',
    })
    .epilogue(
      `Also see the ${terminalLink(
        'Redwood CLI Reference',
        'https://redwoodjs.com/docs/cli-commands#type-check',
      )}`,
    )
}

export const handler = async (options) => {
  const { handler } = await import('./type-checkHandler.js')
  return handler(options)
}
