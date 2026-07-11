import camelcase from 'camelcase'
import { Listr } from 'listr2'

import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'

import { deleteFilesTask, removeRoutesFromRouterTask } from '../../../lib'
import c from '../../../lib/colors'
import { pathName } from '../../generate/helpers'
import {
  files as pageFiles,
  paramVariants as templateVars,
} from '../../generate/page/page'

export const command = 'page <name> [path]'
export const description = 'Destroy a page and route component'
export const builder = (yargs) => {
  yargs.positional('name', {
    description: 'Name of the page',
    type: 'string',
  })
  yargs.positional('path', {
    description: 'URL path to the page. Defaults to name',
    type: 'string',
  })
}

export const tasks = ({ name, path }) =>
  new Listr(
    [
      {
        title: 'Destroying page files...',
        task: async () => {
          const p = pathName(path, name)
          const f = pageFiles({
            name,
            path: p,
            stories: true,
            tests: true,
            ...templateVars(p),
          })
          return deleteFilesTask(f)
        },
      },
      {
        title: 'Cleaning up routes file...',
        task: async () => removeRoutesFromRouterTask([camelcase(name)]),
      },
    ],
    { rendererOptions: { collapseSubtasks: false }, exitOnError: true },
  )

export const handler = async ({ name, path }) => {
  recordTelemetryAttributes({
    command: 'destroy page',
  })
  const t = tasks({ name, path })
  try {
    await t.run()
  } catch (e) {
    console.log(c.error(e.message))
  }
}
