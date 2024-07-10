import * as fs from 'node:fs'
import * as path from 'node:path'

import { getDMMF } from '@prisma/internals'
import chalk from 'chalk'
import execa from 'execa'
import { Listr } from 'listr2'

import { getPaths, transformTSToJS, writeFile } from '../../../lib'
import c from '../../../lib/colors'
import { isTypeScriptProject } from '../../../lib/project'

const MODEL_SCHEMA = `
model BackgroundJob {
  id        Int       @id @default(autoincrement())
  attempts  Int       @default(0)
  handler   String
  queue     String
  priority  Int
  runAt     DateTime?
  lockedAt  DateTime?
  lockedBy  String?
  lastError String?
  failedAt  DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}
`

const getModelNames = async () => {
  const schema = await getDMMF({ datamodelPath: getPaths().api.dbSchema })

  return schema.datamodel.models.map((model) => model.name)
}

const addModel = () => {
  const schema = fs.readFileSync(getPaths().api.dbSchema, 'utf-8')

  const schemaWithUser = schema + MODEL_SCHEMA

  fs.writeFileSync(getPaths().api.dbSchema, schemaWithUser)
}

const tasks = ({ force }) => {
  let skipSchema = false

  return new Listr(
    [
      {
        title: 'Creating job model...',
        task: async (_ctx, task) => {
          if ((await getModelNames()).includes('BackgroundJob')) {
            skipSchema = true
            task.skip('Model already exists, skipping creation')
          } else {
            addModel()
          }
        },
      },
      {
        title: 'Migrating database...',
        task: async (_ctx, task) => {
          if (skipSchema) {
            task.skip('Model already exists, skipping migration')
          } else {
            execa.sync(
              'yarn rw prisma migrate dev',
              ['--name', 'create-background-jobs'],
              {
                shell: true,
                cwd: getPaths().base,
                stdio: 'inherit',
              },
            )
          }
        },
      },
      {
        title: 'Creating config file in api/src/lib...',
        task: async () => {
          const isTs = isTypeScriptProject()
          const outputExtension = isTs ? 'ts' : 'js'
          const outputPath = path.join(
            getPaths().api.lib,
            `jobs.${outputExtension}`,
          )
          let template = fs
            .readFileSync(
              path.resolve(__dirname, 'templates', 'jobs.ts.template'),
            )
            .toString()

          if (!isTs) {
            template = await transformTSToJS(outputPath, template)
          }

          writeFile(outputPath, template, {
            overwriteExisting: force,
          })
        },
      },
      {
        title: 'Creating jobs dir at api/src/jobs...',
        task: () => {
          try {
            fs.mkdirSync(getPaths().api.jobs)
          } catch (e) {
            // ignore directory already existing
            if (!e.message.match('file already exists')) {
              throw new Error(e)
            }
          }
          writeFile(path.join(getPaths().api.jobs, '.keep'), '', {
            overwriteExisting: force,
          })
        },
      },
      {
        title: 'One more thing...',
        task: (_ctx, task) => {
          task.title = `One more thing...
          ${c.green('Background jobs configured!\n')}
          ${'Generate jobs with:'} ${c.warning('yarn rw g job <name>')}
          ${'Execute jobs with:'}  ${c.warning('yarn rw jobs work\n')}
          ${'Check out the docs for more info:'}
          ${chalk.hex('#e8e8e8')('https://docs.redwoodjs.com/docs/background-jobs')}
        `
        },
      },
    ],
    { rendererOptions: { collapseSubtasks: false }, errorOnExist: true },
  )
}

export const handler = async ({ force }) => {
  const t = tasks({ force })

  try {
    await t.run()
  } catch (e) {
    console.log(c.error(e.message))
  }
}
