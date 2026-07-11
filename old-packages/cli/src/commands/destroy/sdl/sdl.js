import { Listr } from 'listr2'

import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'

import { deleteFilesTask } from '../../../lib'
import c from '../../../lib/colors'
import { verifyModelName } from '../../../lib/schemaHelpers'
import { files } from '../../generate/sdl/sdl'

export const command = 'sdl <model>'
export const description =
  'Destroy a GraphQL schema and service component based on a given DB schema Model'

export const builder = (yargs) => {
  yargs.positional('model', {
    description: 'Model to destroy the sdl of',
    type: 'string',
  })
}

export const tasks = ({ model }) =>
  new Listr(
    [
      {
        title: 'Destroying GraphQL schema and service component files...',
        task: async () => {
          const f = await files({ name: model })
          return deleteFilesTask(f)
        },
      },
    ],
    { rendererOptions: { collapseSubtasks: false }, exitOnError: true },
  )

export const handler = async ({ model }) => {
  recordTelemetryAttributes({
    command: 'destroy sdl',
  })
  try {
    const { name } = await verifyModelName({ name: model, isDestroyer: true })
    await tasks({ model: name }).run()
  } catch (e) {
    console.log(c.error(e.message))
  }
}
