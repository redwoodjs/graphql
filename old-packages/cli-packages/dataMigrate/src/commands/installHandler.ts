import fs from 'node:fs'
import path from 'node:path'

import execa from 'execa'
import { Listr } from 'listr2'

import { getPaths } from '@redwoodjs/project-config'

import c from '../lib/colors'

export async function handler() {
  const redwoodProjectPaths = getPaths()

  const tasks = new Listr(
    [
      {
        title: 'Creating the dataMigrations directory...',
        task() {
          fs.mkdirSync(redwoodProjectPaths.api.dataMigrations, {
            recursive: true,
          })
          fs.writeFileSync(
            path.join(redwoodProjectPaths.api.dataMigrations, '.keep'),
            '',
          )
        },
      },
      {
        title: 'Adding the RW_DataMigration model to schema.prisma...',
        task() {
          const dbSchemaFilePath = redwoodProjectPaths.api.dbSchema
          const dbSchemaFileContent = fs.readFileSync(dbSchemaFilePath, 'utf-8')

          fs.writeFileSync(
            dbSchemaFilePath,
            [dbSchemaFileContent.trim(), '', RW_DATA_MIGRATION_MODEL, ''].join(
              '\n',
            ),
          )
        },
      },
      {
        title: 'Creating the database migration...',
        task() {
          return execa.command(createDatabaseMigrationCommand, {
            cwd: redwoodProjectPaths.base,
          }).stdout
        },
      },
    ],
    // Not sure why, but the renderer here really matters to Jest, and 'verbose'
    // is the only one I've found to work. So we set it just during testing.
    {
      renderer: process.env.NODE_ENV === 'test' ? 'verbose' : 'default',
    },
  )

  try {
    await tasks.run()
    console.log(notes)
  } catch (e) {
    process.exitCode = 1
    console.error(c.error((e as Error).message))
  }
}

export const RW_DATA_MIGRATION_MODEL = `\
model RW_DataMigration {
  version    String   @id
  name       String
  startedAt  DateTime
  finishedAt DateTime
}`

export const createDatabaseMigrationCommand =
  'yarn rw prisma migrate dev --name create_data_migrations --create-only'

export const notes = [
  '',
  c.warning("Don't forget to apply the migration when you're ready:"),
  '',
  `  ${c.bold('yarn rw prisma migrate dev')}`,
  '',
].join('\n')
