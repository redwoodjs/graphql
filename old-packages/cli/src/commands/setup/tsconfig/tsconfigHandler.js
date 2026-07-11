import path from 'path'

import { Listr } from 'listr2'

import { errorTelemetry } from '@redwoodjs/telemetry'

import {
  getInstalledRedwoodVersion,
  getPaths,
  saveRemoteFileToDisk,
} from '../../../lib'
import c from '../../../lib/colors'

export const handler = async ({ force }) => {
  const installedRwVersion = getInstalledRedwoodVersion()
  const GITHUB_VERSION_TAG = installedRwVersion.match('canary')
    ? 'main'
    : `v${installedRwVersion}`

  const CRWA_TEMPLATE_URL = `https://raw.githubusercontent.com/redwoodjs/redwood/${GITHUB_VERSION_TAG}/packages/create-redwood-app/templates/ts`

  const tasks = new Listr(
    [
      {
        title: 'Creating tsconfig in web',
        task: () => {
          const webConfigPath = path.join(getPaths().web.base, 'tsconfig.json')

          const templateUrl = `${CRWA_TEMPLATE_URL}/web/tsconfig.json`

          return saveRemoteFileToDisk(templateUrl, webConfigPath, {
            overwriteExisting: force,
          })
        },
      },
      {
        title: 'Creating tsconfig in api',
        task: () => {
          const webConfigPath = path.join(getPaths().api.base, 'tsconfig.json')

          const templateUrl = `${CRWA_TEMPLATE_URL}/api/tsconfig.json`

          return saveRemoteFileToDisk(templateUrl, webConfigPath, {
            overwriteExisting: force,
          })
        },
      },
      {
        title: 'One more thing...',
        task: (_ctx, task) => {
          task.title = `One more thing...\n
          ${c.tip('Quick link to the docs on configuring TypeScript')}
          ${c.link('https://redwoodjs.com/docs/typescript')}
        `
        },
      },
    ],
    { rendererOptions: { collapseSubtasks: false } },
  )

  try {
    await tasks.run()
  } catch (e) {
    errorTelemetry(process.argv, e.message)
    console.error(c.error(e.message))
    process.exit(e?.exitCode || 1)
  }
}
