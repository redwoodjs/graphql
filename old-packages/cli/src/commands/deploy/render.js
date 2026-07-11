import path from 'path'

import execa from 'execa'
import fs from 'fs-extra'
import terminalLink from 'terminal-link'

import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'
import { getPaths } from '@redwoodjs/project-config'

// It's easy for the api side to exceed Render's free-plan limit.
// Because telemetryMiddleware is added to Yargs as middleware,
// we need to set the env var here outside the handler to correctly disable it.
if (process.argv.slice(2).includes('api')) {
  process.env.REDWOOD_DISABLE_TELEMETRY = 1
}

export const command = 'render <side>'
export const description = 'Build, migrate, and serve command for Render deploy'

export const builder = (yargs) => {
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
}

export const handler = async ({ side, prisma, dataMigrate }) => {
  recordTelemetryAttributes({
    command: 'deploy render',
    side,
    prisma,
    dataMigrate,
  })

  const rwjsPaths = getPaths()

  const execaConfig = {
    cwd: rwjsPaths.base,
    shell: true,
    stdio: 'inherit',
  }

  async function runApiCommands() {
    if (prisma) {
      console.log('Running database migrations...')
      execa.commandSync(
        `node_modules/.bin/prisma migrate deploy --schema "${rwjsPaths.api.dbSchema}"`,
        execaConfig,
      )
    }

    if (dataMigrate) {
      console.log('Running data migrations...')
      const packageJson = fs.readJsonSync(
        path.join(rwjsPaths.base, 'package.json'),
      )
      const hasDataMigratePackage =
        !!packageJson.devDependencies['@redwoodjs/cli-data-migrate']

      if (!hasDataMigratePackage) {
        console.error(
          [
            "Skipping data migrations; your project doesn't have the `@redwoodjs/cli-data-migrate` package as a dev dependency.",
            "Without it installed, you're likely to run into memory issues during deploy.",
            "If you want to run data migrations, add the package to your project's root package.json and deploy again:",
            '',
            '```',
            'yarn add -D @redwoodjs/cli-data-migrate',
            '```',
          ].join('\n'),
        )
      } else {
        execa.commandSync('yarn rw dataMigrate up', execaConfig)
      }
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
    execa.commandSync('yarn install', execaConfig)
    execa.commandSync('yarn rw build web --verbose', execaConfig)
  }

  if (side === 'api') {
    runApiCommands()
  } else if (side === 'web') {
    runWebCommands()
  }
}
