import terminalLink from 'terminal-link'

import c from '../lib/colors'
import { sides } from '../lib/project'

export const command = 'test [filter..]'
export const description = 'Run Jest tests. Defaults to watch mode'
export const builder = (yargs) => {
  yargs
    .strict(false) // so that we can forward arguments to jest
    .positional('filter', {
      default: sides(),
      description:
        'Which side(s) to test, and/or a regular expression to match against your test files to filter by',
      type: 'array',
    })
    .option('watch', {
      describe:
        'Run tests related to changed files based on hg/git. Specify the name or path to a file to focus on a specific set of tests',
      type: 'boolean',
      default: true,
    })
    .option('collect-coverage', {
      describe:
        'Show test coverage summary and output info to coverage directory',
      type: 'boolean',
      default: false,
    })
    .option('db-push', {
      describe:
        "Syncs the test database with your Prisma schema without requiring a migration. It creates a test database if it doesn't already exist.",
      type: 'boolean',
      default: true,
    })
    .epilogue(
      `For all available flags, run jest cli directly ${c.tip(
        'yarn jest --help',
      )}\n\nAlso see the ${terminalLink(
        'Redwood CLI Reference',
        'https://redwoodjs.com/docs/cli-commands#test',
      )}\n`,
    )
}

export const handler = async (options) => {
  const { handler } = await import('./testHandler.js')
  return handler(options)
}
