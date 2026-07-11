import execa from 'execa'
import { Listr } from 'listr2'

import { errorTelemetry } from '@redwoodjs/telemetry'

import { getPaths } from '../../lib'
import c from '../../lib/colors'

import { command, description, EXPERIMENTAL_TOPIC_ID } from './setupInngest'
import { printTaskEpilogue } from './util'

export const handler = async ({ force }) => {
  const tasks = new Listr([
    {
      title: `Adding Inngest setup packages for RedwoodJS ...`,
      task: async () => {
        await execa('yarn', ['add', '-D', 'inngest-setup-redwoodjs'], {
          cwd: getPaths().base,
        })
      },
    },
    {
      task: async () => {
        const pluginCommands = ['inngest-setup-redwoodjs', 'plugin']

        if (force) {
          pluginCommands.push('--force')
        }

        await execa('yarn', [...pluginCommands], {
          stdout: 'inherit',
          cwd: getPaths().base,
        })
      },
    },
    {
      task: () => {
        printTaskEpilogue(command, description, EXPERIMENTAL_TOPIC_ID)
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
