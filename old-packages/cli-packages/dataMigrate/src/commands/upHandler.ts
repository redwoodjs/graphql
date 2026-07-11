import fs from 'fs'
import path from 'path'

import type { PrismaClient } from '@prisma/client'
import { Listr } from 'listr2'

import { registerApiSideBabelHook } from '@redwoodjs/babel-config'
import { getPaths } from '@redwoodjs/project-config'

import c from '../lib/colors'
import type { DataMigrateUpOptions, DataMigration } from '../types'

export async function handler({
  importDbClientFromDist,
  distPath,
}: DataMigrateUpOptions) {
  let db: any
  let requireHookRegistered = false

  if (importDbClientFromDist) {
    if (!fs.existsSync(distPath)) {
      console.warn(
        `Can't find api dist at ${distPath}. You may need to build first: yarn rw build api`,
      )
      process.exitCode = 1
      return
    }

    const distLibDbPath = path.join(distPath, 'lib', 'db.js')

    if (!fs.existsSync(distLibDbPath)) {
      console.error(
        `Can't find db.js at ${distLibDbPath}. Redwood expects the db.js file to be in the ${path.join(
          distPath,
          'lib',
        )} directory`,
      )
      process.exitCode = 1
      return
    }

    db = (await import(distLibDbPath)).db
  } else {
    registerApiSideBabelHook()
    requireHookRegistered = true

    db = require(path.join(getPaths().api.lib, 'db')).db
  }

  const pendingDataMigrations = await getPendingDataMigrations(db)

  if (!pendingDataMigrations.length) {
    console.info(c.success(`\n${NO_PENDING_MIGRATIONS_MESSAGE}\n`))
    process.exitCode = 0
    return
  }

  const counters = { run: 0, skipped: 0, error: 0 }

  const dataMigrationTasks = pendingDataMigrations.map((dataMigration) => {
    const dataMigrationName = path.basename(dataMigration.path, '.js')

    return {
      title: dataMigrationName,
      skip() {
        if (counters.error > 0) {
          counters.skipped++
          return true
        } else {
          return false
        }
      },
      async task() {
        if (!requireHookRegistered) {
          registerApiSideBabelHook()
        }

        try {
          const { startedAt, finishedAt } = await runDataMigration(
            db,
            dataMigration.path,
          )
          counters.run++
          await recordDataMigration(db, {
            version: dataMigration.version,
            name: dataMigrationName,
            startedAt,
            finishedAt,
          })
        } catch (e) {
          counters.error++
          console.error(
            c.error(`Error in data migration: ${(e as Error).message}`),
          )
        }
      },
    }
  })

  const tasks = new Listr(dataMigrationTasks, {
    renderer: 'verbose',
  })

  try {
    await tasks.run()
    await db.$disconnect()

    console.log()
    reportDataMigrations(counters)
    console.log()

    if (counters.error) {
      process.exitCode = 1
    }
  } catch {
    process.exitCode = 1
    await db.$disconnect()

    console.log()
    reportDataMigrations(counters)
    console.log()
  }
}

/**
 * Return the list of migrations that haven't run against the database yet
 */
async function getPendingDataMigrations(db: PrismaClient) {
  const dataMigrationsPath = getPaths().api.dataMigrations

  if (!fs.existsSync(dataMigrationsPath)) {
    return []
  }

  const dataMigrations = fs
    .readdirSync(dataMigrationsPath)
    // There may be a `.keep` file in the data migrations directory.
    .filter((dataMigrationFileName) =>
      ['js', '.ts'].some((extension) =>
        dataMigrationFileName.endsWith(extension),
      ),
    )
    .map((dataMigrationFileName) => {
      const [version] = dataMigrationFileName.split('-')

      return {
        version,
        path: path.join(dataMigrationsPath, dataMigrationFileName),
      }
    })

  const ranDataMigrations: DataMigration[] = await db.rW_DataMigration.findMany(
    {
      orderBy: { version: 'asc' },
    },
  )
  const ranDataMigrationVersions = ranDataMigrations.map((dataMigration) =>
    dataMigration.version.toString(),
  )

  const pendingDataMigrations = dataMigrations
    .filter(({ version }) => {
      return !ranDataMigrationVersions.includes(version)
    })
    .sort(sortDataMigrationsByVersion)

  return pendingDataMigrations
}

/**
 * Sorts migrations by date, oldest first
 */
function sortDataMigrationsByVersion(
  dataMigrationA: { version: string },
  dataMigrationB: { version: string },
) {
  const aVersion = parseInt(dataMigrationA.version)
  const bVersion = parseInt(dataMigrationB.version)

  if (aVersion > bVersion) {
    return 1
  }
  if (aVersion < bVersion) {
    return -1
  }
  return 0
}

async function runDataMigration(db: PrismaClient, dataMigrationPath: string) {
  const dataMigration = await import(dataMigrationPath)

  const startedAt = new Date()
  await dataMigration.default({ db })
  const finishedAt = new Date()

  return { startedAt, finishedAt }
}

export const NO_PENDING_MIGRATIONS_MESSAGE =
  'No pending data migrations run, already up-to-date.'

/**
 * Adds data for completed migrations to the DB
 */
async function recordDataMigration(
  db: PrismaClient,
  { version, name, startedAt, finishedAt }: DataMigration,
) {
  await db.rW_DataMigration.create({
    data: { version, name, startedAt, finishedAt },
  })
}

/**
 * Output run status to the console
 */
function reportDataMigrations(counters: {
  run: number
  skipped: number
  error: number
}) {
  if (counters.run) {
    console.info(
      c.success(`${counters.run} data migration(s) completed successfully.`),
    )
  }
  if (counters.error) {
    console.error(
      c.error(`${counters.error} data migration(s) exited with errors.`),
    )
  }
  if (counters.skipped) {
    console.warn(
      c.warning(
        `${counters.skipped} data migration(s) skipped due to previous error.`,
      ),
    )
  }
}
