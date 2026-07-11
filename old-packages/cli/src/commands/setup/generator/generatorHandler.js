import path from 'path'

import fse from 'fs-extra'
import { Listr } from 'listr2'

import { getPaths } from '../../../lib'
import c from '../../../lib/colors'

const SIDE_MAP = {
  web: ['cell', 'component', 'layout', 'page', 'scaffold'],
  api: ['function', 'sdl', 'service'],
}

const copyGenerator = (name, { force }) => {
  const side = SIDE_MAP['web'].includes(name) ? 'web' : 'api'
  const from = path.join(__dirname, '../../generate', name, 'templates')
  const to = path.join(getPaths()[side].generators, name)

  // copy entire template directory contents to appropriate side in app
  fse.copySync(from, to, { overwrite: force, errorOnExist: true })

  return to
}

let destination

const tasks = ({ name, force }) => {
  return new Listr(
    [
      {
        title: 'Copying generator templates...',
        task: () => {
          destination = copyGenerator(name, { force })
        },
      },
      {
        title: 'Destination:',
        task: (ctx, task) => {
          task.title = `  Wrote templates to ${destination.replace(
            getPaths().base,
            '',
          )}`
        },
      },
    ],
    { rendererOptions: { collapseSubtasks: false }, errorOnExist: true },
  )
}

export const handler = async ({ name, force }) => {
  const t = tasks({ name, force })

  try {
    await t.run()
  } catch (e) {
    console.log(c.error(e.message))
  }
}
