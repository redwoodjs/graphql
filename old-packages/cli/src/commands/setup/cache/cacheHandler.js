import path from 'path'

import fs from 'fs-extra'
import { Listr } from 'listr2'

import { addEnvVarTask } from '@redwoodjs/cli-helpers'
import { errorTelemetry } from '@redwoodjs/telemetry'

import { addPackagesTask, getPaths, writeFile } from '../../../lib'
import c from '../../../lib/colors'
import { isTypeScriptProject } from '../../../lib/project'

const CLIENT_PACKAGE_MAP = {
  memcached: 'memjs',
  redis: 'redis',
}

const CLIENT_HOST_MAP = {
  memcached: 'localhost:11211',
  redis: 'redis://localhost:6379',
}

export const handler = async ({ client, force }) => {
  const extension = isTypeScriptProject ? 'ts' : 'js'

  const tasks = new Listr([
    addPackagesTask({
      packages: [CLIENT_PACKAGE_MAP[client]],
      side: 'api',
    }),
    {
      title: `Writing api/src/lib/cache.js`,
      task: () => {
        const template = fs
          .readFileSync(
            path.join(__dirname, 'templates', `${client}.ts.template`),
          )
          .toString()

        return writeFile(
          path.join(getPaths().api.lib, `cache.${extension}`),
          template,
          {
            overwriteExisting: force,
          },
        )
      },
    },
    addEnvVarTask(
      'CACHE_HOST',
      CLIENT_HOST_MAP[client],
      `Where your ${client} server lives for service caching`,
    ),
    {
      title: 'One more thing...',
      task: (_ctx, task) => {
        task.title = `One more thing...\n
          ${c.tip('Check out the Service Cache docs for config and usage:')}
          ${c.link('https://redwoodjs.com/docs/services#caching')}
        `
      },
    },
  ])

  try {
    await tasks.run()
  } catch (e) {
    errorTelemetry(process.argv, e.message)
    console.error(c.error(e.message))
    process.exit(e?.exitCode || 1)
  }
}
