import path from 'path'

import { Listr } from 'listr2'
import terminalLink from 'terminal-link'

import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'

import { getPaths, writeFilesTask, generateTemplate } from '../../../lib'
import c from '../../../lib/colors'
import { prepareForRollback } from '../../../lib/rollback'
import { verifyModelName } from '../../../lib/schemaHelpers'
import { validateName, yargsDefaults } from '../helpers'
const TEMPLATE_PATH = path.resolve(__dirname, 'templates', 'model.js.template')

const files = async ({ name, typescript = false }) => {
  const outputFilename = `${name}.${typescript ? 'ts' : 'js'}`
  const outputPath = path.join(getPaths().api.models, outputFilename)

  return {
    [outputPath]: await generateTemplate(TEMPLATE_PATH, { name }),
  }
}

export const command = 'model <name>'
export const description = 'Generate a RedwoodRecord model'
export const builder = (yargs) => {
  yargs
    .positional('name', {
      description: 'Name of the model to create',
      type: 'string',
    })
    .option('rollback', {
      description: 'Revert all generator actions if an error occurs',
      type: 'boolean',
      default: true,
    })
    .epilogue(
      `Also see the ${terminalLink(
        'RedwoodRecord Reference',
        'https://redwoodjs.com/docs/redwoodrecord',
      )}`,
    )

  Object.entries(yargsDefaults).forEach(([option, config]) => {
    yargs.option(option, config)
  })
}

export const handler = async ({ force, ...args }) => {
  recordTelemetryAttributes({
    command: 'generate model',
    force,
    rollback: args.rollback,
  })

  validateName(args.name)

  const tasks = new Listr(
    [
      {
        title: 'Generating model file...',
        task: async () => {
          return writeFilesTask(await files(args), { overwriteExisting: force })
        },
      },
      {
        title: 'Parsing datamodel, generating api/src/models/index.js...',
        task: async () => {
          const redwoodRecordModule = await import('@redwoodjs/record')
          await redwoodRecordModule.default.parseDatamodel()
        },
      },
    ].filter(Boolean),
    { rendererOptions: { collapseSubtasks: false } },
  )

  try {
    await verifyModelName({ name: args.name })
    if (args.rollback && !force) {
      prepareForRollback(tasks)
    }
    await tasks.run()
  } catch (e) {
    console.log(c.error(e.message))
    process.exit(1)
  }
}
