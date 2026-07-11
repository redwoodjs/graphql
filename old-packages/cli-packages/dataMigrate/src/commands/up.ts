import terminalLink from 'terminal-link'
import type { Argv } from 'yargs'

import { getPaths } from '@redwoodjs/project-config'

import type { DataMigrateUpOptions } from '../types'

export const command = 'up'
export const description =
  'Run any outstanding Data Migrations against the database'

export function builder(yargs: Argv): Argv {
  return yargs
    .option('import-db-client-from-dist', {
      type: 'boolean',
      alias: ['db-from-dist'],
      description: 'Import the db client from dist',
      default: false,
    })
    .option('dist-path', {
      type: 'string',
      alias: 'd',
      description: 'Path to the api dist directory',
      default: getPaths().api.dist,
    })
    .epilogue(
      `Also see the ${terminalLink(
        'Redwood CLI Reference',
        'https://redwoodjs.com/docs/cli-commands#datamigrate-up',
      )}`,
    )
}

export async function handler(options: DataMigrateUpOptions): Promise<void> {
  const { handler: dataMigrateUpHandler } = await import('./upHandler.js')
  await dataMigrateUpHandler(options)
}
