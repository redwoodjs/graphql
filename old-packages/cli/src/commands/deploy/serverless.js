import path from 'path'

import boxen from 'boxen'
import chalk from 'chalk'
import { config } from 'dotenv-defaults'
import execa from 'execa'
import fs from 'fs-extra'
import { Listr } from 'listr2'
import prompts from 'prompts'
import terminalLink from 'terminal-link'

import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'

import { getPaths } from '../../lib'
import c from '../../lib/colors'

export const command = 'serverless'
export const aliases = ['aws serverless', 'sls']
export const description = 'Deploy to AWS via the serverless framework'

export const builder = (yargs) => {
  yargs.option('stage', {
    describe:
      'serverless stage pass through param: https://www.serverless.com/blog/stages-and-environments',
    default: 'production',
    type: 'string',
  })

  yargs.option('sides', {
    describe: 'which Side(s) to deploy',
    choices: ['api', 'web'],
    default: ['api', 'web'],
    alias: 'side',
    type: 'array',
  })

  yargs.option('verbose', {
    describe: 'verbosity of logs',
    default: true,
    type: 'boolean',
  })

  yargs.option('pack-only', {
    describe: 'Only build and pack, and dont push code up using serverless',
    default: false,
    type: 'boolean',
  })

  yargs.option('first-run', {
    describe:
      'Set this flag the first time you deploy, to configure your API URL on the webside',
    default: false,
    type: 'boolean',
  })

  yargs.epilogue(
    `Also see the ${terminalLink(
      'Redwood CLI Reference',
      'https://redwoodjs.com/docs/cli-commands#deploy',
    )}\n`,
  )
}

export const preRequisites = () => [
  {
    title: 'Checking if Serverless framework is installed...',
    command: ['yarn serverless', ['--version']],
    errorMessage: [
      'Looks like Serverless is not installed.',
      'Please run yarn add -W --dev serverless.',
    ],
  },
]

export const buildCommands = ({ sides }) => {
  return [
    {
      title: `Building ${sides.join(' & ')}...`,
      command: ['yarn', ['rw', 'build', ...sides]],
    },
    {
      title: 'Packing Functions...',
      enabled: () => sides.includes('api'),
      task: async () => {
        // Dynamically import this function
        // because its dependencies are only installed when `rw setup deploy serverless` is run
        const { nftPack } = await import('./packing/nft.js')

        await nftPack()
      },
    },
  ]
}

export const deployCommands = ({ stage, sides, firstRun, packOnly }) => {
  const slsStage = stage ? ['--stage', stage] : []

  return sides.map((side) => {
    return {
      title: `Deploying ${side}....`,
      task: async () => {
        await execa('yarn', ['serverless', 'deploy', ...slsStage], {
          cwd: path.join(getPaths().base, side),
          shell: true,
          stdio: 'inherit',
          cleanup: true,
        })
      },
      skip: () => {
        if (firstRun && side === 'web') {
          return 'Skipping web deploy, until environment configured'
        }

        if (packOnly) {
          return 'Finishing early due to --pack-only flag. Your Redwood project is packaged and ready to deploy'
        }
      },
    }
  })
}

const loadDotEnvForStage = (dotEnvPath) => {
  // Make sure we use the correct .env based on the stage
  config({
    path: dotEnvPath,
    defaults: path.join(getPaths().base, '.env.defaults'),
    encoding: 'utf8',
  })
}

export const handler = async (yargs) => {
  recordTelemetryAttributes({
    command: 'deploy serverless',
    sides: JSON.stringify(yargs.sides),
    verbose: yargs.verbose,
    packOnly: yargs.packOnly,
    firstRun: yargs.firstRun,
  })

  const rwjsPaths = getPaths()
  const dotEnvPath = path.join(rwjsPaths.base, `.env.${yargs.stage}`)

  // Make sure .env.staging, .env.production, etc are loaded based on the --stage flag
  loadDotEnvForStage(dotEnvPath)

  const tasks = new Listr(
    [
      ...preRequisites(yargs).map(mapCommandsToListr),
      ...buildCommands(yargs).map(mapCommandsToListr),
      ...deployCommands(yargs).map(mapCommandsToListr),
    ],
    {
      exitOnError: true,
      renderer: yargs.verbose && 'verbose',
    },
  )
  try {
    await tasks.run()

    if (yargs.firstRun) {
      const SETUP_MARKER = chalk.bgBlue(chalk.black('First Setup '))
      console.log()

      console.log(SETUP_MARKER, c.success('Starting first setup wizard...'))

      const { stdout: slsInfo } = await execa(
        `yarn serverless info --verbose --stage=${yargs.stage}`,
        {
          shell: true,
          cwd: getPaths().api.base,
        },
      )

      const deployedApiUrl = slsInfo.match(/HttpApiUrl: (https:\/\/.*)/)[1]

      console.log()
      console.log(SETUP_MARKER, `Found ${c.success(deployedApiUrl)}`)
      console.log()

      const { addDotEnv } = await prompts({
        type: 'confirm',
        name: 'addDotEnv',
        message: `Add API_URL to your .env.${yargs.stage}? This will be used if you deploy the web side from your machine`,
      })

      if (addDotEnv) {
        fs.writeFileSync(dotEnvPath, `API_URL=${deployedApiUrl}`)

        // Reload dotenv, after adding the new file
        loadDotEnvForStage(dotEnvPath)
      }

      if (yargs.sides.includes('web')) {
        console.log()
        console.log(SETUP_MARKER, 'Deploying web side with updated API_URL')

        console.log(
          SETUP_MARKER,
          'First deploys can take a good few minutes...',
        )
        console.log()

        const webDeployTasks = new Listr(
          [
            // Rebuild web with the new API_URL
            ...buildCommands({ ...yargs, sides: ['web'], firstRun: false }).map(
              mapCommandsToListr,
            ),
            ...deployCommands({
              ...yargs,
              sides: ['web'],
              firstRun: false,
            }).map(mapCommandsToListr),
          ],
          {
            exitOnError: true,
            renderer: yargs.verbose && 'verbose',
          },
        )

        // Deploy the web side now that the API_URL has been configured
        await webDeployTasks.run()

        const { stdout: slsInfo } = await execa(
          `yarn serverless info --verbose --stage=${yargs.stage}`,
          {
            shell: true,
            cwd: getPaths().web.base,
          },
        )

        const deployedWebUrl = slsInfo.match(/url: (https:\/\/.*)/)[1]

        const message = [
          c.bold('Successful first deploy!'),
          '',
          `View your deployed site at: ${c.success(deployedWebUrl)}`,
          '',
          'You can use serverless.com CI/CD by connecting/creating an app',
          'To do this run `yarn serverless` on each of the sides, and connect your account',
          '',
          'Find more information in our docs:',
          c.underline('https://redwoodjs.com/docs/deploy#serverless'),
        ]

        console.log(
          boxen(message.join('\n'), {
            padding: { top: 0, bottom: 0, right: 1, left: 1 },
            margin: 1,
            borderColor: 'gray',
          }),
        )
      }
    }
  } catch (e) {
    console.error(c.error(e.message))
    process.exit(e?.exitCode || 1)
  }
}

const mapCommandsToListr = ({
  title,
  command,
  task,
  cwd,
  errorMessage,
  skip,
  enabled,
}) => {
  return {
    title,
    task: task
      ? task
      : async () => {
          try {
            const executingCommand = execa(...command, {
              cwd: cwd || getPaths().base,
              shell: true,
            })
            executingCommand.stdout.pipe(process.stdout)
            await executingCommand
          } catch (error) {
            if (errorMessage) {
              error.message = error.message + '\n' + errorMessage.join(' ')
            }
            throw error
          }
        },
    skip,
    enabled,
  }
}
