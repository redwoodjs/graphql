import terminalLink from 'terminal-link'
import type { Argv } from 'yargs'

export const command = 'install'
export const description = 'Add the RW_DataMigration model to your schema'

export function builder(yargs: Argv): Argv {
  return yargs.epilogue(
    `Also see the ${terminalLink(
      'Redwood CLI Reference',
      'https://redwoodjs.com/docs/cli-commands#datamigrate-install',
    )}`,
  )
}

export async function handler(): Promise<void> {
  const { handler: dataMigrateInstallHandler } = await import(
    './installHandler.js'
  )
  await dataMigrateInstallHandler()
}
