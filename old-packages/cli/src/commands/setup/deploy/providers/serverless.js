// import terminalLink from 'terminal-link'
import path from 'path'

import fs from 'fs-extra'
import { Listr } from 'listr2'

import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'
import { errorTelemetry } from '@redwoodjs/telemetry'

import { addPackagesTask, getPaths, printSetupNotes } from '../../../../lib'
import c from '../../../../lib/colors'
import { addToGitIgnoreTask, addToDotEnvTask, addFilesTask } from '../helpers'
import { SERVERLESS_API_YML } from '../templates/serverless/api'
import { SERVERLESS_WEB_YML } from '../templates/serverless/web'

export const command = 'serverless'
export const description =
  '[DEPRECATED]\n' +
  'Setup Serverless Framework AWS deploy\n' +
  'For more information:\n' +
  'https://redwoodjs.com/docs/deploy/serverless'

export const aliases = ['aws-serverless']

export const notes = [
  c.error('DEPRECATED option not officially supported'),
  '',
  'For more information:',
  'https://redwoodjs.com/docs/deploy/serverless',
  '',
  '',
  c.success("You're almost ready to deploy using the Serverless framework!"),
  '',
  '• See https://redwoodjs.com/docs/deploy#serverless-deploy for more info. If you ',
  '  want to give it a shot, open your `.env` file and add your AWS credentials,',
  '  then run: ',
  '',
  '    yarn rw deploy serverless --first-run',
  '',
  '  For subsequent deploys you can just run `yarn rw deploy serverless`.',
  '',
  '• If you want to use the Serverless Dashboard to manage your app, plug in',
  '  the values for `org` and `app` in `web/serverless.yml` and `api/serverless.yml`',
  '',
  "• If you haven't already, familiarize yourself with the docs for your",
  '  preferred provider: https://www.serverless.com/framework/docs/providers',
]

const projectDevPackages = [
  'serverless',
  'serverless-lift',
  '@vercel/nft',
  'archiver',
  'fs-extra',
]

const files = [
  {
    path: path.join(getPaths().api.base, 'serverless.yml'),
    content: SERVERLESS_API_YML,
  },
  {
    path: path.join(getPaths().web.base, 'serverless.yml'),
    content: SERVERLESS_WEB_YML,
  },
]

const prismaBinaryTargetAdditions = () => {
  const content = fs.readFileSync(getPaths().api.dbSchema).toString()

  if (!content.includes('rhel-openssl-1.0.x')) {
    const result = content.replace(
      /binaryTargets =.*\n/,
      `binaryTargets = ["native", "rhel-openssl-1.0.x"]\n`,
    )

    fs.writeFileSync(getPaths().api.dbSchema, result)
  }
}

// updates the api_url to use an environment variable.
const updateRedwoodTomlTask = () => {
  return {
    title: 'Updating redwood.toml apiUrl...',
    task: () => {
      const configPath = path.join(getPaths().base, 'redwood.toml')
      const content = fs.readFileSync(configPath).toString()

      const newContent = content.replace(
        /apiUrl.*?\n/m,
        'apiUrl = "${API_URL:/api}"       # Set API_URL in production to the Serverless deploy endpoint of your api service, see https://redwoodjs.com/docs/deploy/serverless-deploy\n',
      )
      fs.writeFileSync(configPath, newContent)
    },
  }
}

export const handler = async ({ force }) => {
  recordTelemetryAttributes({
    command: 'setup deploy serverless',
    force,
  })
  const [serverless, serverlessLift, ...rest] = projectDevPackages

  const tasks = new Listr(
    [
      addPackagesTask({
        packages: [serverless, ...rest],
        devDependency: true,
      }),
      addPackagesTask({
        packages: [serverless, serverlessLift],
        side: 'web',
        devDependency: true,
      }),
      addPackagesTask({
        packages: [serverless],
        side: 'api',
        devDependency: true,
      }),
      addFilesTask({
        files,
        force,
      }),
      updateRedwoodTomlTask(),
      addToGitIgnoreTask({
        paths: ['.serverless'],
      }),
      addToDotEnvTask({
        lines: [
          'AWS_ACCESS_KEY_ID=<your-key-here>',
          'AWS_SECRET_ACCESS_KEY=<your-secret-key-here>',
        ],
      }),
      {
        title: 'Adding necessary Prisma binaries...',
        task: () => prismaBinaryTargetAdditions(),
      },
      printSetupNotes(notes),
    ],
    {
      exitOnError: true,
      rendererOptions: { collapseSubtasks: false },
    },
  )
  try {
    await tasks.run()
  } catch (e) {
    errorTelemetry(process.argv, e.message)
    console.error(c.error(e.message))
    process.exit(e?.exitCode || 1)
  }
}
