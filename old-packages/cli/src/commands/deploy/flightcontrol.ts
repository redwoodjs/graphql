import path from 'path'

import execa from 'execa'
import fs from 'fs-extra'
import terminalLink from 'terminal-link'
import type { Argv } from 'yargs'

import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'
import { getPaths } from '@redwoodjs/project-config'

export const command = 'flightcontrol <side>'
export const alias = 'fc'
export const description =
  'Build, Migrate, and Serve commands for Flightcontrol deploy'

export const builder = (yargs: Argv) => {
  yargs
    .positional('side', {
      choices: ['api', 'web'],
      description: 'Side to deploy',
      type: 'string',
    })
    .option('prisma', {
      description: 'Apply database migrations',
      type: 'boolean',
      default: true,
    })
    .option('serve', {
      description: 'Run server for api in production',
      type: 'boolean',
      default: false,
    })
    .option('data-migrate', {
      description: 'Apply data migrations',
      type: 'boolean',
      default: true,
      alias: 'dm',
    })
    .epilogue(
      `For more commands, options, and examples, see ${terminalLink(
        'Redwood CLI Reference',
        'https://redwoodjs.com/docs/cli-commands#deploy',
      )}`,
    )

  return yargs
}

interface HandlerArgs {
  side: 'api' | 'web'
  prisma: boolean
  serve: boolean
  dm: boolean
}

export const handler = async ({
  side,
  serve,
  prisma,
  dm: dataMigrate,
}: HandlerArgs) => {
  recordTelemetryAttributes({
    command: 'deploy flightcontrol',
    side,
    prisma,
    dataMigrate,
    serve,
  })
  const rwjsPaths = getPaths()

  const execaConfig: execa.Options = {
    cwd: rwjsPaths.base,
    shell: true,
    stdio: 'inherit',
  }

  async function runExecaCommand(command: string) {
    const result = await execa.command(command, execaConfig)

    if (result.failed) {
      throw new Error(`Command (${command}) failed`)
    }

    return result
  }

  async function runApiCommands() {
    if (!serve) {
      console.log('Building api...')
      await runExecaCommand('yarn rw build api --verbose')

      if (prisma) {
        console.log('Running database migrations...')
        await runExecaCommand(
          `node_modules/.bin/prisma migrate deploy --schema "${rwjsPaths.api.dbSchema}"`,
        )
      }

      if (dataMigrate) {
        console.log('Running data migrations...')
        await runExecaCommand('yarn rw dataMigrate up')
      }

      return
    }

    const serverFilePath = path.join(rwjsPaths.api.dist, 'server.js')
    const hasServerFile = fs.pathExistsSync(serverFilePath)

    if (hasServerFile) {
      execa(`yarn node ${serverFilePath}`, execaConfig)
    } else {
      const { handler } = await import(
        '@redwoodjs/api-server/dist/apiCLIConfigHandler.js'
      )
      handler()
    }
  }

  async function runWebCommands() {
    console.log('Building web...')
    await runExecaCommand('yarn rw build web --verbose')
  }

  if (side === 'api') {
    await runApiCommands()
  } else if (side === 'web') {
    await runWebCommands()
  }
}
