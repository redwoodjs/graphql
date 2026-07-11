import * as fs from 'node:fs'
import * as path from 'node:path'

import { getDMMF } from '@prisma/internals'
import { Listr } from 'listr2'

import { addApiPackages } from '@redwoodjs/cli-helpers'

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

// TODO(jgmw): This won't handle prisma with schema folder preview feature
const addDatabaseModel = () => {
  const schema = fs.readFileSync(getPaths().api.dbSchema, 'utf-8')

  const schemaWithUser = schema + MODEL_SCHEMA

  fs.writeFileSync(getPaths().api.dbSchema, schemaWithUser)
}

const tasks = async ({ force }) => {
  const modelExists = (await getModelNames()).includes('BackgroundJob')

  const packageJsonPath = path.join(getPaths().base, 'package.json')
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
  const redwoodVersion =
    packageJson.devDependencies?.['@redwoodjs/core'] ?? 'latest'
  const jobsPackage = `@redwoodjs/jobs@${redwoodVersion}`

  return new Listr(
    [
      {
        title: 'Creating job database model...',
        task: () => {
          addDatabaseModel()
        },
        skip: () => {
          if (modelExists) {
            return 'BackgroundJob model exists, skipping'
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
          fs.mkdirSync(getPaths().api.jobs, { recursive: true })
          writeFile(path.join(getPaths().api.jobs, '.keep'), '', {
            overwriteExisting: force,
          })
        },
      },
      addApiPackages([jobsPackage]),
      {
        title: 'One more thing...',
        task: (_ctx, task) => {
          task.title = `One more thing...

          ${c.success('\nBackground jobs configured!\n')}

          ${!modelExists ? 'Migrate your database to finish setting up jobs:\n' : ''}
          ${!modelExists ? c.highlight('\n\u00A0\u00A0yarn rw prisma migrate dev\n') : ''}

          Generate jobs with: ${c.highlight('yarn rw g job <name>')}
          Execute jobs with:  ${c.highlight('yarn rw jobs work\n')}

          Check out the docs for more info:
          ${c.link('https://docs.redwoodjs.com/docs/background-jobs')}

        `
        },
      },
    ],
    { rendererOptions: { collapseSubtasks: false }, errorOnExist: true },
  )
}

export const handler = async ({ force }) => {
  const t = await tasks({ force })

  try {
    await t.run()
  } catch (e) {
    console.error(c.error(e.message))
  }
}
