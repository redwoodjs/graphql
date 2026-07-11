import execa from 'execa'
import { vol, fs as memfs } from 'memfs'
import { vi, describe, expect, it } from 'vitest'

import { getPaths } from '@redwoodjs/project-config'

import {
  handler,
  RW_DATA_MIGRATION_MODEL,
  createDatabaseMigrationCommand,
  notes,
} from '../commands/installHandler'

vi.mock('fs', async () => ({ ...memfs, default: { ...memfs } }))
vi.mock('node:fs', async () => ({ ...memfs, default: { ...memfs } }))

vi.mock('execa', () => {
  return {
    default: {
      command: vi.fn(() => {
        return {
          stdout: 42,
        }
      }),
    },
  }
})

describe('installHandler', () => {
  it("the RW_DATA_MIGRATION_MODEL  hasn't unintentionally changed", () => {
    expect(RW_DATA_MIGRATION_MODEL).toMatchInlineSnapshot(`
      "model RW_DataMigration {
        version    String   @id
        name       String
        startedAt  DateTime
        finishedAt DateTime
      }"
    `)
  })

  it("the `createDatabaseMigrationCommand` hasn't unintentionally changed", () => {
    expect(createDatabaseMigrationCommand).toMatchInlineSnapshot(
      `"yarn rw prisma migrate dev --name create_data_migrations --create-only"`,
    )
  })

  it('adds a data migrations directory, model, and migration', async () => {
    const redwoodProjectPath = '/redwood-app'
    process.env.RWJS_CWD = redwoodProjectPath

    vol.fromNestedJSON(
      {
        'redwood.toml': '',
        api: {
          db: {
            'schema.prisma': '',
          },
        },
      },
      redwoodProjectPath,
    )

    console.log = vi.fn()

    await handler()

    const dataMigrationsPath = getPaths().api.dataMigrations

    expect(memfs.readdirSync(dataMigrationsPath)).toEqual(['.keep'])
    expect(memfs.readFileSync(getPaths().api.dbSchema, 'utf-8')).toMatch(
      RW_DATA_MIGRATION_MODEL,
    )
    expect(execa.command).toHaveBeenCalledWith(createDatabaseMigrationCommand, {
      cwd: getPaths().base,
    })
    expect(console.log).toHaveBeenCalledWith(notes)
  })
})
